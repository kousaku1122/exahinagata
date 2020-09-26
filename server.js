const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const MongoClient = require('mongodb').MongoClient;
const mongouri = 'mongodb+srv://'+process.env.USER+':'+process.env.PASS+'@'+process.env.MONGOHOST;


app.get('/', (req, res) => {
  if(req.cookies.user) {
    res.sendFile(__dirname + '/views/success.html');
    return;
  }

  res.sendFile(__dirname + '/views/index.html');
});

app.post("/saveUser", function(req, res) {
  let received = "";
  req.setEncoding("utf8");
  req.on("data", function(chunk) {
    received += chunk;
  });
  req.on("end", function() {
    MongoClient.connect(mongouri, function(error, client) {
      const db = client.db(process.env.DB); // 対象 DB
      const colUser = db.collection("users"); // 対象コレクション
      const user = JSON.parse(received); // 保存対象
      colUser.insertOne(user, function(err, result) {
        res.send(result.insertedId.toString()); // 追加したデータの ID を返す
        client.close(); // DB を閉じる
      });
    });
  });
});

app.get("/findUsers", function(req, res) {
  MongoClient.connect(mongouri, function(error, client) {
    const db = client.db(process.env.DB); // 対象 DB
    const colUser = db.collection("users"); // 対象コレクション

    // 検索条件（名前が「エクサくん」ではない）
    // 条件の作り方： https://docs.mongodb.com/manual/reference/operator/query/
    const condition = { name: { $ne: "エクサくん" } };

    colUser.find(condition).toArray(function(err, users) {
      res.json(users); // レスポンスとしてユーザを JSON 形式で返却
      client.close(); // DB を閉じる
    });
  });
});

app.post("/deleteUser", function(req, res) {
  let received = "";
  req.setEncoding("utf8");
  req.on("data", function(chunk) {
    received += chunk;
  });
  req.on("end", function() {
    MongoClient.connect(mongouri, function(error, client) {
      const db = client.db(process.env.DB); // 対象 DB
      const colUser = db.collection("users"); // 対象コレクション
      const target = JSON.parse(received); // 保存対象
      const oid = new ObjectID(target.id);

      colUser.deleteOne({ _id: { $eq: oid } }, function(err, result) {
        res.sendStatus(200); // ステータスコードを返す
        client.close(); // DB を閉じる
      });
    });
  });
});

app.get('/deleteall', function(req, res){
  MongoClient.connect(mongouri, function(error, client) {
    const db = client.db(process.env.DB); // 対象 DB
    const colUser = db.collection('users'); // 対象コレクション
    colUser.deleteMany({}, function(err, result) {
      res.sendStatus(200); // ステータスコードを返す
      client.close(); // DB を閉じる
    });
  });
});

// 登録画面
app.get('/signup', (req, res) => {
  if(req.cookies.user) {
    res.sendFile(__dirname + '/views/success.html');
    return;
  }

  res.sendFile(__dirname + '/views/signup.html');
});

app.get('/login', (req, res) => {
  if(req.cookies.user) {
    res.sendFile(__dirname + '/views/success.html');
    return;
  }

  res.sendFile(__dirname + '/views/login.html');
});

const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
