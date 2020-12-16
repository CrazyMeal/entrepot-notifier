import { HashedArticle } from "./HashedArticle";

export class FaunaArticle {
  ref: any;
  data: HashedArticle;

  constructor(ref: any, data: HashedArticle) {
    this.ref = ref;
    this.data = data;
  }
}