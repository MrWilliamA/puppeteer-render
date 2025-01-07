const puppeteer = require("puppeteer");
require("dotenv").config();

const scrapeLogic = async (res) => {
  async function getNewBrowserTab(browser) {
    let resultPromise;

    async function onTargetcreatedHandler(target) {
      if (target.type() === "page") {
        const newPage = await target.page();
        const newPagePromise = new Promise((y) =>
          newPage.once("domcontentloaded", () => y(newPage))
        );

        const isPageLoaded = await newPage.evaluate(() => document.readyState);

        browser.off("targetcreated", onTargetcreatedHandler); // unsubscribing

        return isPageLoaded.match("complete|interactive")
          ? resultPromise(newPage)
          : resultPromise(newPagePromise);
      }
    }

    return new Promise((resolve) => {
      resultPromise = resolve;
      browser.on("targetcreated", onTargetcreatedHandler);
    });
  }

  const browser = await puppeteer.launch({
    headless: false, // Enable headful mode for debugging
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    );

    // Navigate to the URL
    await page.goto("https://uac.edu.au/");

    // Set screen size
    await page.setViewport({ width: 1600, height: 919 });

    // Type into the search box
    await page.type("#searchBlockInput", "test");
    await page.click("#searchBlockButton");

    // Wait for search results to load
    await page.waitForSelector(".instituteContainer", { visible: true });

    // Wait for and click on the first search result link
    const textSelector = await page.waitForSelector(".courseName a", {
      visible: true,
    });

    await textSelector.click();

    //because it opens a new tab
    const newPage = await getNewBrowserTab(browser);
    await newPage.bringToFront();

    // Wait a bit to see the page
    await new Promise((resolve) => setTimeout(resolve, 5000));

    await newPage.waitForSelector("h1", { visible: true, timeout: 60000 }); // Fallback if navigation fails
    console.log("New page URL:", newPage.url());
    // Wait for the page to load and locate the title element
    const titleSelector = "h1"; // Assuming the title is in an <h1> tag
    await newPage.waitForSelector(titleSelector, { visible: true });

    // Get the full title of the article
    const fullTitle = await newPage.$eval(titleSelector, (el) =>
      el.textContent.trim()
    );

    // Print and send the full title
    const logStatement = `The title of this blog post is: ${fullTitle}`;
    console.log(logStatement);
    res.send(logStatement);
  } catch (e) {
    console.error("Error:", e);
    res.send(`Something went wrong while running Puppeteer: ${e}`);
  } finally {
    // await browser.close();
    console.log("finsihed");
  }
};

module.exports = { scrapeLogic };
