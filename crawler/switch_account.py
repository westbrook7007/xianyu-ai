"""
备份并清除闲鱼浏览器登录态，便于换号登录
用法: python switch_account.py
"""

import shutil
from datetime import datetime
from pathlib import Path

import yaml

CONFIG_PATH = Path(__file__).parent / "config.yaml"


def load_config():
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return yaml.safe_load(f)


def main():
    profile_name = load_config()["browser"]["profile_dir"].lstrip("./")
    profile_dir = Path(__file__).parent / profile_name

    if not profile_dir.exists():
        print(f"[INFO] 无现有登录态目录: {profile_dir.name}")
        return

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = profile_dir.parent / f"{profile_dir.name}_backup_{stamp}"

    print(f"[INFO] 备份当前账号到: {backup_dir.name}")
    shutil.move(str(profile_dir), str(backup_dir))
    print("[OK] 已退出原闲鱼账号（本地登录态已清除）")
    print("     下一步将打开浏览器，请用新账号扫码登录。")


if __name__ == "__main__":
    main()
