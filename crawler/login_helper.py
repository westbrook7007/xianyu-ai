"""
闲鱼登录助手 - 仅打开浏览器供手动扫码登录
用法: python login_helper.py
登录成功后关闭窗口，登录状态会保存，爬虫可直接使用
"""

import asyncio
from pathlib import Path
import yaml
from playwright.async_api import async_playwright

CONFIG_PATH = Path(__file__).parent / "config.yaml"


def load_config():
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return yaml.safe_load(f)


async def main():
    config = load_config()
    profile_dir = str(Path(__file__).parent / config["browser"]["profile_dir"])

    # 降低被识别为机器人的概率
    launch_args = [
        "--disable-blink-features=AutomationControlled",
        "--no-first-run",
        "--no-default-browser-check",
    ]

    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir=profile_dir,
            headless=False,
            channel=config["browser"].get("channel", "chrome"),
            viewport={"width": 1280, "height": 900},
            locale="zh-CN",
            args=launch_args,
            ignore_default_args=["--enable-automation"],
        )
        page = context.pages[0] if context.pages else await context.new_page()

        # 隐藏 webdriver 标记
        await page.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', { get: () => undefined });"
        )

        await page.goto("https://www.goofish.com/", wait_until="domcontentloaded")

        print("=" * 50)
        print("  请在浏览器中完成登录（推荐扫码）")
        print("  1. 点击页面右上角「登录」")
        print("  2. 用闲鱼 App 扫右侧二维码（不要用短信登录）")
        print("  3. 登录成功后，回到这里按 Enter 键")
        print("=" * 50)

        input("\n登录完成后按 Enter 保存并退出... ")
        await context.close()
        print("登录状态已保存！可以启动爬虫了。")


if __name__ == "__main__":
    asyncio.run(main())
