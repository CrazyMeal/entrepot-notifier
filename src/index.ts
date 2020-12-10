import puppeteer from 'puppeteer';

import { Article } from './Article';

async function getArticlesFromEntrepot() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://www.entrepot.ulaval.ca');

  const result = await page.evaluate(() => {
    return Array
      .from(document.querySelectorAll('article'))
      .map(article => {
        const content = article.getElementsByClassName('content').item(0);
        const notice = article.getElementsByClassName('notice').item(0);
        
        if (content && notice) {
          const title = content.getElementsByTagName('a').item(0)!.innerText;
          const link = content.getElementsByTagName('a').item(0)!.attributes.getNamedItem('href')!.textContent!;
          const price = content.getElementsByTagName('span').item(0)!.innerText;

          const noticeText = notice.getElementsByTagName('p').item(0)!.textContent!;
          const noticeIsHidden = window.getComputedStyle(notice).display === 'none';

          return {title, price, link, noticeIsHidden, noticeText};
        } else {
          return null;
        }
      })
      .filter((e): e is any => !!e);
  });

  await browser.close();

  return result.map(article => new Article(article.title, article.price, article.link, article.noticeText, article.noticeIsHidden));
};

getArticlesFromEntrepot().then(articles => {
  console.log(articles);
});
