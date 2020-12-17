import { HashedArticle } from './domain/HashedArticle';
import { FaunaArticle } from './domain/FaunaArticle';
import { EntrepotService } from './services/EntrepotService';
import { FaunaService } from './services/FaunaService';
import { ArticleService } from './services/ArticleService';
import { TillService } from './services/TillService';
import { TillMessage } from './domain/TillMessage';

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const entrepotService = new EntrepotService();
const faunaService = new FaunaService();
const articleService = new ArticleService();
const tillService = new TillService();

(async () => {
  const articlesFromEntrepot = await entrepotService.getArticlesFromEntrepot();

  const hashedEntrepotArticles = articleService.hashArticles(articlesFromEntrepot);

  console.log(`Found ${hashedEntrepotArticles.length} articles from entrepot`);

  const [changedArticlesDocs, newArticles]: [Array<FaunaArticle>, Array<HashedArticle>] = await Promise.all([
    faunaService.getChangedArticles(hashedEntrepotArticles),
    faunaService.getNewArticles(hashedEntrepotArticles)
  ]);

  const changedArticles = articleService.mapToArticeChanges(changedArticlesDocs, hashedEntrepotArticles);

  if (newArticles.length > 0 || changedArticles.length > 0) {
    console.log(`${changedArticles.length} article(s) changed`);
    console.log(`${newArticles.length} new articles`);

    Promise
      .all([
        ...newArticles.map(newArticle => faunaService.saveNewArticle(newArticle)),
        ...changedArticles.map(changedArticle => faunaService.updateArticle(changedArticle))
      ])
      .then(results => console.log('Successfully saved stuff to Fauna', results.map((result: any) => result.data)))
      .catch(error => console.error('An error occured when saving to Fauna', error));

    const tillMessage = new TillMessage(
      articleService.mapToTillText(newArticles, changedArticles),
      process.env.TILL_RECIPIENTS!.split(',')
    );

    tillService
      .sendMessage(tillMessage)
      .then(result => console.log('Successfully sent Till message', result))
      .catch(error => console.error('An error occured sending message through Till', error));
  } else {
    console.log('Nothing new !');
  }

})().catch(error => console.error('An error occured', error));
