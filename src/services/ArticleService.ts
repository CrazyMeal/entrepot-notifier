import hashHelper from 'object-hash';

import { Article } from "../domain/Article";
import { ArticleChange } from "../domain/ArticleChange";
import { FaunaArticle } from "../domain/FaunaArticle";
import { HashedArticle } from "../domain/HashedArticle";
import { TillMessage } from '../domain/TillMessage';

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

  public mapToTillText = (newArticles: Array<HashedArticle>, changedArticles: Array<ArticleChange>): string => {
    let newArticlesPart = '';
    if (newArticles.length > 0) {
      newArticlesPart += newArticles.length > 1 ?
        'De nouveaux articles sont disponibles dans l\'entrepôt:\n'
        : 'Un nouvel article est disponible dans l\'entrepot:\n';

      newArticlesPart += newArticles
        .map(article => '- ' + article.title + ' au prix de ' + article.price + '\n')
        .reduce((acc, curr) => acc + curr);;
    }

    let changedArticlesPart = '';
    if (changedArticles.length > 0) {
      changedArticlesPart += changedArticles.length > 1 ?
        'Des articles ont été modifiés dans l\'entrepôt:\n'
        : 'Un article a été modifié dans l\'entrepôt:\n';

      changedArticlesPart += changedArticles
        .map(article => {
          if (article.noticeChange && article.noticeVisibilityChange) {
            return '- La notice de "' + article.title + '" a changé de "' + article.noticeBefore + '" à "' + article.noticeAfter + '" et est maintenant ' + (article.noticeIsHiddenAfter ? 'masquée\n' : 'affichée\n');
          } else {
            if (article.noticeChange) {
              return '- La notice de ' + article.title + ' a changé de "' + article.noticeBefore + '" à "' + article.noticeAfter + '"\n';
            } else if (article.noticeVisibilityChange) {
              return '- La notice de ' + article.title + ' est maintenant ' + (article.noticeIsHiddenAfter ? 'masquée\n' : 'affichée\n');
            } else {
              return 'Could not determine change for "' + article.title + '"\n';
            }
          }
        })
        .reduce((acc, curr) => acc + curr);
    }

    return '--- Entrepot notifier ---\n\n' + newArticlesPart + '\n' + changedArticlesPart;
  }
};