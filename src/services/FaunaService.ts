import * as faunadb from 'faunadb';
import { ArticleChange } from '../domain/ArticleChange';
import { HashedArticle } from '../domain/HashedArticle';

export class FaunaService {
  private faunaQuery: any;
  private faunaClient: faunadb.Client;

  constructor() {
    const faunaSecret = process.env.FAUNADB_SECRET_KEY;
    this.faunaQuery = faunadb.query;
    this.faunaClient = new faunadb.Client({ secret: faunaSecret!, timeout: 30 });
  }

  public async getChangedArticles(hashedArticles: Array<HashedArticle>): Promise<any> {
    const faunaHashQuery = hashedArticles
      .map(hashedArticle => {
        return this.faunaQuery.Difference(
          this.faunaQuery.Match(this.faunaQuery.Index("article_hash"),  hashedArticle.hash),
          this.faunaQuery.Intersection(
            this.faunaQuery.Match(this.faunaQuery.Index("article_notice"), hashedArticle.notice),
            this.faunaQuery.Match(this.faunaQuery.Index("article_noticeIsHidden"), hashedArticle.noticeIsHidden)
          )
        );
      });
  
    const result: any = await this.faunaClient.query(
      this.faunaQuery.Map(
        this.faunaQuery.Paginate(
          this.faunaQuery.Union(
            faunaHashQuery
          )
        ),
        this.faunaQuery.Lambda("z", this.faunaQuery.Get(this.faunaQuery.Var("z")))
      )
    );

    return Promise.resolve(result.data);
  };
  
  public async getNewArticles(hashedArticles: Array<any>): Promise<Array<HashedArticle>> {
  
    const faunaHashQuery = hashedArticles
      .map(hashedArticle => hashedArticle.hash)
      .map(hash => this.faunaQuery.Match(this.faunaQuery.Index("article_hash"), hash));
  
    const knownArticles: any = await this.faunaClient.query(
      this.faunaQuery.Map(
        this.faunaQuery.Paginate(
          this.faunaQuery.Union(
            faunaHashQuery
          )
        ),
        this.faunaQuery.Lambda("z", this.faunaQuery.Get(this.faunaQuery.Var("z")))
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
  
  public saveNewArticle(article: any) {
    return this.faunaClient.query(
      this.faunaQuery.Create(
        this.faunaQuery.Collection('articles'),
        {
          data: article
        }
    ));
  };
  
  public updateArticle(article: ArticleChange) {
    return this.faunaClient.query(
      this.faunaQuery.Update( article.docRef, {
        data: {
          notice: article.noticeAfter,
          noticeIsHidden: article.noticeIsHiddenAfter
        }
      })
    );
  };
};