export class Article {
  title: string;
  price: string;
  link: string;
  notice: string;
  noticeIsHidden: boolean;

  constructor(title: string, price: string, link: string, notice: string, noticeIsHidden: boolean) {
    this.title = title;
    this.price = price;
    this.link = link;
    this.notice = notice;
    this.noticeIsHidden = noticeIsHidden;
  }
}