/**
 * This is the main Node.js server script for your project
 * Check out the two endpoints this back-end API provides in fastify.get and fastify.post below
 */
require("dotenv").config();
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)

const sassMiddleware = require("sass");
const logger = require("./src/plugins/logger");
const { GoogleSpreadsheet } = require('google-spreadsheet');

// Require the fastify framework and instantiate it
const fastify = require("fastify")({
  // Set this to true for detailed logging:
  logger: false,
});

// Setup our static files
fastify.register(require("fastify-static"), {
  root: path.join(__dirname, "public"),
  prefix: "/", // optional: default '/'
});

//継続起動アクセス用
fastify.get("/", function(request, reply) {
  reply
      .code(200)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send({ world: 'is Dao' })
});

// fastify-formbody lets us parse incoming forms
fastify.register(require("fastify-formbody"));

// point-of-view is a templating manager for fastify
fastify.register(require("point-of-view"), {
  engine: {
    handlebars: require("handlebars"),
  },
});
//
// // Load and parse SEO data
// const seo = require("./src/seo.json");
// if (seo.url === "glitch-default") {
//   seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
// }

const { Client, Constants, Intents, TextChannel } = require("discord.js");

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

client.once("ready", async () => {
    const data = [{
        name: "whitelist_add",
        description: "ホワリス当たったんか？おめでとうな。アドレスプリーズ。",
    }];
    await client.application.commands.set(data, process.env.DISCORD_GUILD_ID);
    console.log("Ready!");
});
const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID);
const creds = require("./"+process.env.CREDENCIAL_FILE_PATH); // the file saved above
(async function() {
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
}());

client.on("interactionCreate", async (message) => {
    logger.debug(message)
    if (!message.isCommand()) {
        return;
    }
    if (message.commandName === 'whitelist_add') {
      let filter = m => m.author.id === message.author.id
      message.reply({ content: 'Pong!', ephemeral: true }).then(async () => {
        logger.log('whitelist_add');
        logger.debug(doc.title);
//         await doc.updateProperties({ title: 'renamed doc' });

//         const sheet = doc.sheetsByIndex[0]; // or use doc.sheetsById[id] or doc.sheetsByTitle[title]
//         console.log(sheet.title);
//         console.log(sheet.rowCount);

//         // adding / removing sheets
//         const newSheet = await doc.addSheet({ title: 'hot new sheet!' });
//         await newSheet.delete();
      //message.channel.send(`Are you sure to delete all data? \`YES\` / \`NO\``).then(() => {
        message.channel.awaitMessages(filter, {
            max: 1,
            time: 30000,
            errors: ['time']
          })
          .then(async message => {
            message = message.first()
            
          })
          .catch(error => {
              message.channel.send('Timeout');
          });
      })
    }
});


client.on("messageCreate", async (message) => {
  if(message.content.startsWith('/whitelist_add') && !message.author.bot ){
    //logger.debug('messageCreate', message)
    const sheet = doc.sheetsByIndex[0]; // the first sheet
    const rows = await sheet.getRows();
    
    logger.debug(message.author.id)
    message.content = message.content.replace(/　/g," ")
    let words = message.content.split(' ')
    logger.debug(words)
    logger.debug('words[3]', words[3] == 'undefined')
    
    let daytime = dayjs(message.createdTimestamp, 'YYYY/MM/DD HH:MM:SS').tz('Asia/Tokyo').format()
    logger.debug(daytime)
    const sundar = await sheet.addRow({id: message.author.id,
                                       username: message.author.username,
                                       discriminator:message.author.discriminator,
                                       address: words[1],
                                       pj: words[2],
                                       createdTime: daytime
                                      });
    logger.debug(sundar)
    
    await sheet.loadCells('A1:D5');
    const cellA1 = sheet.getCell(0, 0);
    const cellC3 = sheet.getCellByA1('C3');
  }
});

client.login(process.env.DISCORD_BOT_TOKEN).catch(console.error);


// def add_income(worksheet, name, disid, diseth, disevent, disetc):#引数で受け取ったシートに引数で受け取った収入を記録する関数
//     lists = worksheet.get_all_values()  #シートの内容を配列で取得
//     rows = len(lists) + 1               #入力されているデータの数を取得し、末端に書き込むときのインデックスとして利用する為+1する
//     if disetc == '{3}':
//         disetc = ''
//     worksheet.update_cell(rows,2,name)  #引数で受け取った名前をセルに入力
//     worksheet.update_cell(rows,3,disid) #引数で受け取ったIDをセルに入力
//     worksheet.update_cell(rows,4,diseth) #address
//     worksheet.update_cell(rows,5,disevent) #イベント名
//     worksheet.update_cell(rows,6,disetc) #その他

// from oauth2client.service_account import ServiceAccountCredentials

// scope = ['https://spreadsheets.google.com/feeds','https://www.googleapis.com/auth/drive']

// # ***.json　は各自ダウンロードしたjsonファイル名に変更してください
// credentials = ServiceAccountCredentials.from_json_keyfile_name('discord.json', scope)
// gc = gspread.authorize(credentials)

// # スプレッドシートのキーを入れてください
// SPREAD_SHEET_KEY = ""
// workbook = gc.open_by_key(SPREAD_SHEET_KEY)

// #DiscordのBotのTokenを入れてください。
// DISCORD_TOKEN = ""
// client = discord.Client()

// @client.event
// async def on_message(message):  # メッセージを受け取ったときの挙動
//   #  if message.author.bot:  # Botのメッセージは除く
//     #   return
//     if message.channel.name != 'dont-touch':
//         if message.channel.name != 'dont-touc2':
//             return
//     #print(message.content)
//     #lists = workbook.get_all_values()
//     #rows = len(lists)

//     if message.content == '入力が無効':
//       return

//     receipt = message.content.split(',,,')

//     if len(receipt) < 3 :                      #支出、収入の入力がフォーマットに沿ってなかったら弾く
//            await message.channel.send('入力が無効')
//            await client.get_channel(38222539133).send('入力が無効') #数字はdiscordチャネルのID
//            #client.get_channel('938422243665539133').send('入力が無効')
//            #await message.guild.channels.cache.get('938422243665539133').send('入力が無効')

//            return

//     worksheet_list = workbook.worksheets()
//     exist = False
//     today = str(receipt[2]).upper()
//     for current in worksheet_list :
//         if current.title == today :
//             exist = True                                #当該イベントのシートがあればフラグを立てる
//     if exist == False :                                 #当該イベントのシートがなければここで作成する
//          workbook.add_worksheet(title=today, rows = 10000, cols = 7)      #余裕を持って行数は10000行、幅は7行のシートを新規作成する
//          newsheet = workbook.worksheet(today)           #作成したシートの初期値を設定する
//          newsheet.update('B1','NAME')
//          newsheet.update('C1','NUMBER')
//          newsheet.update('D1','ADDRESS')
//          newsheet.update('E1','EVENT')
//          newsheet.update('F1','etc')

//     #　シート書き込み
//     add_income(workbook.worksheet(today),str(receipt[0]),str(receipt[1]),str(receipt[3]),str(receipt[2]),str(receipt[4]))
//     #worksheet_list[0].update_cell(1, 1, receipt[1]]

// client.run(DISCORD_TOKEN)

// main.py

// Run the server and report out to the logs
const PORT = process.env.PORT || 3000;
fastify.listen(PORT, "0.0.0.0", function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Your app is listening on ${address}`);
  fastify.log.info(`server listening on ${address}`);
});
