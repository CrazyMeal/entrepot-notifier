"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Article = void 0;
var Article = /** @class */ (function () {
    function Article(title, price, link, notice, noticeIsHidden) {
        this.title = title;
        this.price = price;
        this.link = link;
        this.notice = notice;
        this.noticeIsHidden = noticeIsHidden;
    }
    return Article;
}());
exports.Article = Article;
