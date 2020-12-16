import hashHelper from 'object-hash';

import { Article } from "../domain/Article";
import { ArticleChange } from "../domain/ArticleChange";
import { FaunaArticle } from "../domain/FaunaArticle";
import { HashedArticle } from "../domain/HashedArticle";

export class ArticleService {

  public hashArticles = (articles: Array<Article>): Array<HashedArticle> => {
    return articles
      .map(article => new HashedArticle(
        hashHelper(article.forHash()),
        article.title,
        article.price,
        article.link,
        article.notice,
        article.noticeIsHidden
      ));
  }

  public mapToArticeChanges = (faunaArticles: Array<FaunaArticle>, hashedEntrepotArticles: Array<HashedArticle>): Array<ArticleChange> => {
    return faunaArticles
      .map(changedArticleDoc => {
        const changedArticle = changedArticleDoc.data;

        const entrepotArticle = hashedEntrepotArticles.find(art => art.hash === changedArticle.hash)!;

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
      })
  }
};