# discord_src

[動作環境]
- Glitchにgithubからimportしてenv.sampleを複製して.envとし値を記述
- Googleスプレッドシートから5分ごとに定期起動するためのコードAppsScriptはspread_sheet.txt参照
- Glichからスプレッドに編集許可をするためGCPのAPI認証キーをjson typeで発行してGlitch直下に配置し.envにファイル名を記述
- またAPIキー認証時に発行されるID(*****@*****.iam.gserviceaccount.com)をスプレッドシートの共同編集者に追加
- Discordのボットの権限はサーバー権限がある人に踏んでもらうこと