const express = require('express')
const md5 = require('blueimp-md5')
const {UserModel} = require('../db/models')
const router = express.Router()
const filter = {_v:0,password:0}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
router.get('/user', function(req, res, next) {
  // 得到请求cookie的userid
  const userId = req.cookies.userId
  if(!userId){
    return res.send({code: 1, msg: '请先登陆'});
  }
  UserModel.findOne({_id:userId},filter,(err,userData) => {
    if(userData){
      return res.json({code:0,data:userData})
    }else{
      res.clearCookie('userId')
      return res.send({code: 2, msg: '没有这个用户'});
    }
  })
});
router.post('/register',(req,res) => {
  //1.获取数据
  const {username,password,type} = req.body;
  UserModel.findOne({username},(err,data) => {
    if(data){//用户名已存在
      res.send({code: 1, msg: '此用户已存在'})
    }else{
      new UserModel({username,password:md5(password),type}).save((err,userData)=>{
        if(userData){//保存成功，返回成功
          //cookie 注册后立即登陆 免登陆7天
          res.cookie('userId',userData._id,{maxAge:1000*60*60*24*7})
          res.json({code:0,data:{_id:userData._id,username,type}})
        }else{
          res.json({code:2,msg:'网络错误'})
        }
      })
    }
  })
})
router.post('/login',(req,res)=>{
  const {username,password} = req.body;
  UserModel.findOne({username,password:md5(password)},filter,(err,userData) => {
    if(userData){
      //cookie 注册后立即登陆 免登陆7天
      res.cookie('userId',userData._id,{maxAge:1000*60*60*24*7})
      res.json({code:0,data:{_id:userData._id,username,type:userData.type,header:userData.header}})
    }else{
      res.send({code: 1, msg: '用户名或密码错误'})
    }
  })
})
// 3. 更新用户路由
router.post('/update', function (req, res,next) {
  // 得到请求cookie的userid
  const userId = req.cookies.userId
  if(!userId) {// 如果没有, 说明没有登陆, 直接返回提示
    return res.send({code: 1, msg: '请先登陆'});
  }
  //更新数据库中对应的数据
  UserModel.findByIdAndUpdate({_id: userId}, req.body, function (err, user) {// user是数据库中原来的数据
    const {_id, username, type} = user
    // node端 ...不可用
    // const data = {...req.body, _id, username, type}
    // 合并用户信息
    const data = Object.assign(req.body, {_id, username, type})
    // assign(obj1, obj2, obj3,...) // 将多个指定的对象进行合并, 返回一个合并后的对象
    res.send({code: 0, data})
  })
})
module.exports = router;
