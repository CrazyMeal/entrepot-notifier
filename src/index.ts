import puppeteer, { errors } from 'puppeteer';
import hashHelper from 'object-hash';
import * as faunadb from 'faunadb';

import { Article } from './Article';
import { ArticleChange } from './ArticleChange';

const faunaSecret = process.env.FAUNADB_SECRET_KEY;
const faunaQuery = faunadb.query;
const faunaClient = new faunadb.Client({ secret: faunaSecret!, timeout: 30 });

async function getArticlesFromEntrepot() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://www.entrepot.ulaval.ca');

  const result = await page.evaluate(() => {
    return Array
      .from(document.querySelectorAll('article'))
      .map(article => {
        const content = article.getElementsByClassName('content').item(0);
        const notice = article.getElementsByClassName('notice').item(0);

        if (content && notice) {
          const title = content.getElementsByTagName('a').item(0)!.innerText;
          const link = content.getElementsByTagName('a').item(0)!.attributes.getNamedItem('href')!.textContent!;
          const price = content.getElementsByTagName('span').item(0)!.innerText;

          const noticeText = notice.getElementsByTagName('p').item(0)!.textContent!;
          const noticeIsHidden = window.getComputedStyle(notice).display === 'none';

          return { title, price, link, noticeIsHidden, noticeText };
        } else {
          return null;
        }
      })
      .filter((e): e is any => !!e);
  });

  await browser.close();

  return result.map(article => new Article(article.title, article.price, article.link, article.noticeText, article.noticeIsHidden));
};

async function getChangedArticles(hashedArticles: Array<any>): Promise<any> {
  const faunaHashQuery = hashedArticles
    .map(hashedArticle => {
      return faunaQuery.Difference(
        faunaQuery.Match(faunaQuery.Index("article_hash"),  hashedArticle.hash),
        faunaQuery.Intersection(
          faunaQuery.Match(faunaQuery.Index("article_notice"), hashedArticle.notice),
          faunaQuery.Match(faunaQuery.Index("article_noticeIsHidden"), hashedArticle.noticeIsHidden)
        )
      );
    });

  return await faunaClient.query(
    faunaQuery.Map(
      faunaQuery.Paginate(
        faunaQuery.Union(
          faunaHashQuery
        )
      ),
      faunaQuery.Lambda("z", faunaQuery.Get(faunaQuery.Var("z")))
    )
  );
};

async function getNewArticles(hashedArticles: Array<any>): Promise<Array<any>> {

  const faunaHashQuery = hashedArticles
    .map(hashedArticle => hashedArticle.hash)
    .map(hash => faunaQuery.Match(faunaQuery.Index("article_hash"), hash));

  const knownArticles: any = await faunaClient.query(
    faunaQuery.Map(
      faunaQuery.Paginate(
        faunaQuery.Union(
          faunaHashQuery
        )
      ),
      faunaQuery.Lambda("z", faunaQuery.Get(faunaQuery.Var("z")))
    )
  );

  return Promise.resolve(
    hashedArticles
      .filter(hashedArticle => knownArticles.data
        .map((doc: any) => doc.data)
        .filter((knownArticle: any) => knownArticle.hash === hashedArticle.hash).length === 0
      )
  );
};

async function saveNewArticle(article: any) {
  return faunaClient.query(
    faunaQuery.Create(
      faunaQuery.Collection('articles'),
      {
        data: article
      }
  ));
};

async function updateArticle(article: ArticleChange) {
  return faunaClient.query(
    faunaQuery.Update( article.docRef, {
      data: {
        notice: article.noticeAfter,
        noticeIsHidden: article.noticeIsHiddenAfter
      }
    })
  );
};


(async () => {
  const articlesFromEntrepot = await getArticlesFromEntrepot();

  const hashedArticles = articlesFromEntrepot.map(article => {
    const hash = hashHelper(article.forHash());
    return { hash, ...article }
  });

  console.log(`Found ${hashedArticles.length} articles from entrepot`, hashedArticles);

  const [changedArticlesDocs, newArticles]: [any, Array<any>] = await Promise.all([getChangedArticles(hashedArticles), getNewArticles(hashedArticles)]);

  const changedArticles = (changedArticlesDocs.data as Array<any>)
    .map(changedArticleDoc => {
      const changedArticle = changedArticleDoc.data;

      const entrepotArticle = hashedArticles.find(art => art.hash === changedArticle.hash)!;

      const articleChange = new ArticleChange(entrepotArticle.title, entrepotArticle.price, changedArticleDoc.ref);

      if (entrepotArticle.noticeIsHidden !== changedArticle.noticeIsHidden) {
        articleChange.noticeVisibilityChange = true;
        articleChange.noticeIsHiddenBefore = changedArticle.noticeIsHidden;
        articleChange.noticeIsHiddenAfter = entrepotArticle.noticeIsHidden;
      }

      if (entrepotArticle.notice !== changedArticle.notice) {
        articleChange.noticeChange = true;
        articleChange.noticeBefore = changedArticle.notice;
        articleChange.noticeAfter = entrepotArticle.notice;
      }

      return articleChange;
    });



  console.log(`${changedArticles.length} article(s) changed`);
  console.log(`${newArticles.length} new articles`);

  await Promise.all([...newArticles.map(newArticle => saveNewArticle(newArticle)), ...changedArticles.map(changedArticle => updateArticle(changedArticle))]);
  
})();
