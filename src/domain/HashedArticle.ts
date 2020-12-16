import { Article } from "./Article";

export class HashedArticle extends Article {
  hash: string;

  constructor(hash: string, title: string, price: string, link: string, notice: string, noticeIsHidden: boolean) {
    super(title, price, link, notice, noticeIsHidden);
    this.hash = hash;
  }
}