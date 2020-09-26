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
    res.sendFile(__dirname + '/views/index.html');
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

app.post('/deleteUser', function(req, res){
  let received = ''; // 受信データ（文字列）
  req.setEncoding('utf8');
  req.on('data', function(chunk) {
    received += chunk;
  });
  req.on('end', function() {
    MongoClient.connect(mongouri, function(error, client) {
      const db = client.db(process.env.DB); // 対象 DB
      const colUser = db.collection('users'); // 対象コレクション
      const target = JSON.parse(received); // JavaScript に復元
      const oid = new ObjectID(target.id); // ObjectID 型変数

      colUser.deleteOne({_id:{$eq:oid}}, function(err, result) {
        res.sendStatus(200); // ステータスコードを返す
        client.close(); // DB を閉じる
      });
    });
  });
});


// 登録画面
app.get('/login', (req, res) => {
  if(req.cookies.user) {
    res.sendFile(__dirname + '/views/index.html');
    return;
  }

  res.sendFile(__dirname + '/views/login.html');
});

app.get('/signup', (req, res) => {
  if(req.cookies.user) {
    res.sendFile(__dirname + '/views/success.html');
    return;
  }

  res.sendFile(__dirname + '/views/signup.html');
});

// ログイン失敗画面
app.get('/failed', (req, res) => {
  if(req.cookies.user) {
    res.sendFile(__dirname + '/views/success.html');
    return;
  }

  res.sendFile(__dirname + '/views/failed.html');
});

app.get('/logout', (req, res) => {
  res.clearCookie('user'); // クッキーをクリア
  res.redirect('/');
});

app.post('/signup', function(req, res){
  const userName = req.body.userName;
  const password = req.body.password;
  MongoClient.connect(mongouri, function(error, client) {
    const db = client.db(process.env.DB); // 対象 DB
    const col = db.collection('accounts'); // 対象コレクション
    const user = {name: userName, password:password}; // 保存対象
    // ★★★本来パスワードは平文（入力されたそのままの文字列）で保存すべきではない
    // crypto モジュールでハッシュ化するなどすべき
    // ログインの際も入力されたパスワードをハッシュ化した上で
    // 保存されているハッシュ化済みのパスワードと比較する
    // 参考：https://qiita.com/kou_pg_0131/items/174aefd8f894fea4d11a
    col.insertOne(user, function(err, result) {
      res.redirect('/'); // リダイレクト
      client.close(); // DB を閉じる
    });
  });
});

app.post('/login', function(req, res){
  const userName = req.body.userName;
  const password = req.body.password;
  MongoClient.connect(mongouri, function(error, client) {
    const db = client.db(process.env.DB); // 対象 DB
    const col = db.collection('accounts'); // 対象コレクション

    // 登録時にパスワードをハッシュ化しているならば
    // ここで password をハッシュ化して検索する
    // ハッシュ化した値同士で比較する
    const condition = {name:{$eq:userName}, password:{$eq:password}}; // ユーザ名とパスワードで検索する
    col.findOne(condition, function(err, user){
      client.close();
      if(user) {
        res.cookie('user', user); // ヒットしたらクッキーに保存
        res.redirect('/'); // リダイレクト
      }else{
        res.redirect('/failed'); // リダイレクト
      }
    });
  });
});

// ハッシュ化用
const crypto = require('crypto');

function hashed(password) {
  let hash = crypto.createHmac('sha512', password)
  hash.update(password)
  let value = hash.digest('hex')
  return value;
}
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
