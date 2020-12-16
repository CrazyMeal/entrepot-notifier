export class ArticleChange {
  title: string;
  price: string;
  docRef: any;
  
  noticeChange? : boolean;
  noticeBefore?: string;
  noticeAfter?: string;

  noticeVisibilityChange? : boolean;
  noticeIsHiddenBefore?: boolean;
  noticeIsHiddenAfter?: boolean;


  constructor(title: string, price: string, docRef: any,
    noticeChange? : boolean, noticeBefore?: string, noticeAfter?: string,
    noticeVisibilityChange? : boolean, noticeIsHiddenBefore?: boolean, noticeIsHiddenAfter?: boolean) {
    
      this.title = title;
      this.price = price;
      this.docRef = docRef;
      
      this.noticeChange = noticeChange;
      this.noticeBefore = noticeBefore;
      this.noticeAfter = noticeAfter;

      this.noticeVisibilityChange = noticeVisibilityChange;
      this.noticeIsHiddenBefore = noticeIsHiddenBefore;
      this.noticeIsHiddenAfter = noticeIsHiddenAfter;
  }
}