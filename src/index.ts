import puppeteer from 'puppeteer';
import hashHelper from 'object-hash';
import * as faunadb from 'faunadb';

import { Article } from './Article';

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

          return {title, price, link, noticeIsHidden, noticeText};
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
      return faunaQuery.Intersection(
        faunaQuery.Match(faunaQuery.Index("article_hash"), hashedArticle.hash),
        faunaQuery.Match(faunaQuery.Index("article_notice"), hashedArticle.notice),
        faunaQuery.Match(faunaQuery.Index("article_noticeIsHidden"), hashedArticle.noticeIsHidden),
      );
    });    

  return await faunaClient.query(
    faunaQuery.Map(
      faunaQuery.Paginate(
        faunaQuery.Difference(
          faunaQuery.Match(faunaQuery.Index("article_all")),
          faunaQuery.Union(
            faunaHashQuery
          )
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


(async () => {
  const articlesFromEntrepot = await getArticlesFromEntrepot();
  
  const hashedArticles = articlesFromEntrepot.map(article => {
    const hash = hashHelper(article.forHash());
    return { hash, ...article }
  });

  console.log(`Found ${hashedArticles.length} articles from entrepot`);

  const [changedArticles, newArticles]: [any, Array<any>] = await Promise.all([getChangedArticles(hashedArticles), getNewArticles(hashedArticles)]);

  console.log(`${changedArticles.data.length} article(s) changed`);
  console.log(`${newArticles.length} new articles`);

  (changedArticles.data as Array<any>).map(doc => doc.data).forEach(changedArticle => {
    const entrepotArticle = hashedArticles.find(art => art.hash === changedArticle.hash)!;

    if (entrepotArticle.noticeIsHidden !== changedArticle.noticeIsHidden) {
      if (entrepotArticle.notice !== changedArticle.notice) {
        console.log(`Notice for ${entrepotArticle.title} has changed from ${changedArticle.notice} to ${entrepotArticle.notice} and also became ${entrepotArticle.noticeIsHidden ? 'invisible' : 'visible'}`);
      } else {
        console.log(`Notice for ${entrepotArticle.title} became ${entrepotArticle.noticeIsHidden ? 'invisible' : 'visible'}`);
      }
    } else {
      console.log(`Notice for ${entrepotArticle.title} has changed from ${changedArticle.notice} to ${entrepotArticle.notice}`);
    }
  });

})();

/*
getArticlesFromEntrepot().then(articles => {
  const hashedArticles = articles.map(article => {
    const hash = hashHelper(article.forHash());
    return { hash, ...article }
  });

  Promise
    .all([getChangedArticles(hashedArticles), getNewArticles(hashedArticles)])
    .then(result => {
      const changedArticles = result[0];
      const newArticles = result[1];
    })
    .catch(error => console.error('An error occured', error));
});
*/


