const express = require('express')
const md5 = require('blueimp-md5')
const {UserModel, ChatModel} = require('../db/models')
const router = express.Router()
const filter = {_v:0,password:0}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
//根据userid获取用户的相关信息
router.get('/user', function(req, res, next) {
  // 得到请求cookie的userid
  const userId = req.cookies.userId
  if(!userId){
    return res.send({code: 1, msg: '请先登陆'});
  }
  UserModel.findOne({_id:userId},filter,(err,userData) => {
    if(userData){
      res.json({code:0,data:userData})
    }else{
      res.clearCookie('userId')
      //return res.send({code: 2, msg: '没有这个用户'});
    }
  })
});
//根据类型获取用户列表
router.get('/userlist',function (req,res,next) {
  const {type} = req.query
  UserModel.find({type},filter,(err, userData)=>{
    if(userData){
      res.json({code:0,data:userData})
    }else{
      res.send({code: 1, msg: '暂时没数据'});
    }
  })
})
/*获取当前用户所有相关聊天信息列表*/
router.get('/msglist', function (req, res) {
  // 获取cookie中的userid
  const userId = req.cookies.userId
  // 查询得到所有user文档数组
  UserModel.find(function (err, userDocs) {
    // 用对象存储所有user信息: key为user的_id, val为name和header组成的user对象
    const users = {} // 对象容器
    userDocs.forEach(doc => {
      users[doc._id] = {username: doc.username, header: doc.header}
    })
    /*
    查询userid相关的所有聊天信息
     参数1: 查询条件
     参数2: 过滤条件
     参数3: 回调函数
    */
    ChatModel.find({'$or': [{from: userId}, {to: userId}]}, filter, function (err, chatMsgs) {
      // 返回包含所有用户和当前用户相关的所有聊天消息的数据
      console.log(chatMsgs)
      res.send({code: 0, data: {users, chatMsgs}})
    })
  })
})
/*修改指定消息为已读*/
router.post('/readmsg', function (req, res) {
  // 得到请求中的from和to
  const from = req.body.from
  const to = req.cookies.userId
  /*
  更新数据库中的chat数据
  参数1: 查询条件
  参数2: 更新为指定的数据对象
  参数3: 是否1次更新多条, 默认只更新一条
  参数4: 更新完成的回调函数
   */
  ChatModel.update({from, to, read: false}, {read: true}, {multi: true}, function (err, doc) {
    console.log('/readmsg', doc)
    res.send({code: 0, data: doc.nModified}) // 更新的数量
  })
})
//注册
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
//登录
router.post('/login',(req,res)=>{
  const {username,password} = req.body;
  UserModel.findOne({username,password:md5(password)},filter,(err,userData) => {
    if(userData){
      //cookie 注册后立即登陆 免登陆7天
      res.cookie('userId',userData._id,{maxAge:1000*60*60*24*7})
      res.json({code:0,data:userData})
    }else{
      res.send({code: 1, msg: '用户名或密码错误'})
    }
  })
})
//更新用户信息
router.post('/update', function (req, res,next) {
  // 得到请求cookie的userid
  const userId = req.cookies.userId
  if(!userId) {// 如果没有, 说明没有登陆, 直接返回提示
    return res.send({code: 1, msg: '请先登陆'});
  }
  /*UserModel.update({_id:userId},{$set:req.body},(err,userData) => {
    if(userData){
      const {_id, username, type} = userData
      const data = Object.assign(req.body, {_id, username, type})
      res.send({code: 0, data})
    }else{
      res.send({code: 2, msg: '更新失败'})
    }
  })*/
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
