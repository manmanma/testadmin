const express = require('express')
const md5 = require('blueimp-md5')
const {UserModel} = require('../db/models')
const router = express.Router()
const filter = {_v:0,password:0}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
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
      res.json({code:0,data:{_id:userData._id,username}})
    }else{
      res.send({code: 1, msg: '用户名或密码错误'})
    }
  })
})
module.exports = router;
