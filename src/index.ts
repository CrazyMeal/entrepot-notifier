import { HashedArticle } from './domain/HashedArticle';
import { FaunaArticle } from './domain/FaunaArticle';
import { EntrepotService } from './services/EntrepotService';
import { FaunaService } from './services/FaunaService';
import { ArticleService } from './services/ArticleService';

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const entrepotService = new EntrepotService();
const faunaService = new FaunaService();
const articleService = new ArticleService();

(async () => {
  const articlesFromEntrepot = await entrepotService.getArticlesFromEntrepot();

  const hashedEntrepotArticles = articleService.hashArticles(articlesFromEntrepot);

  console.log(`Found ${hashedEntrepotArticles.length} articles from entrepot`);

  const [changedArticlesDocs, newArticles]: [Array<FaunaArticle>, Array<HashedArticle>] = await Promise.all([
    faunaService.getChangedArticles(hashedEntrepotArticles), 
    faunaService.getNewArticles(hashedEntrepotArticles)
  ]);

  const changedArticles = articleService.mapToArticeChanges(changedArticlesDocs, hashedEntrepotArticles);

  console.log(`${changedArticles.length} article(s) changed`);
  console.log(`${newArticles.length} new articles`);

  await Promise.all([
    ...newArticles.map(newArticle => faunaService.saveNewArticle(newArticle)), 
    ...changedArticles.map(changedArticle => faunaService.updateArticle(changedArticle))
  ]);

})().catch(error => console.error('An error occured', error));
