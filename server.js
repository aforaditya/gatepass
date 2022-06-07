const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express()
const ObjectId = require('bson-objectid')
var nodemailer = require('nodemailer');
var sms = require('fast-two-sms')
require('dotenv').config();

// Local Time

function calcTime() {

  // create Date object for current location
  var date = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  // date.setTime(date.getTime() + 5.5 * 60 * 60 * 1000);
   console.log(date);
  return date

}



//Configuration

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
  }))
  app.use(session({
    secret: 'secrettexthere',
    resave: false,
    saveUninitialized: false
  }))
  app.use(passport.initialize())
  app.use(passport.session())
  app.use(express.static('public'))

const userSchema = mongoose.Schema({
    username: String,
    password: String,
    name : String,
    image : String,
    image_status : String,
    group : String,
    contact : String,
    parent : String,
    room : String,
    hostel : String,
    role  : String,
    mail : String,
    passes : []
  })

  const profileSchema = mongoose.Schema({
    username : String,
    name : String,
    image : String,
    image_status : String,
    room : String,
  })
  

const ProfileRequest = mongoose.model('profileRequest' , profileSchema) 

userSchema.plugin(passportLocalMongoose , {usernameLowerCase: true})
const User = mongoose.model('user', userSchema)

const passSchema = mongoose.Schema({
  name : String,
  hostel : String,
  image : String,
  passcode : String,
  passname : String,
  username : String,
  group : String,
  room : String,
  location : String,
  purpose : String,
  contact : String,
  parent : String,
  outtime : String,
  intime : String,
  status : String,
  requested_time : String,
  otp : String,
  actual_out_time : String,
  actual_in_time : String,
  late_entry : String
})

const Pass = mongoose.model('pass', passSchema)


passport.use(User.createStrategy())

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

//Connecting to DB
// mongoose.connect('mongodb://localhost:27017/usersDB')

mongoose.connect(process.env.MONGODB_LINK, {useNewUrlParser : true})

 // Function to render home

 function renderHome(req, res, flag=true){

  console.log('Render home ' + flag );
         
  ProfileRequest.findOne({ username : req.user.username } , (err,result)=>{

    try {
      var img_status = result.image_status;
    } catch (error) {
      console.log('Unexpected error');
        
    }

    try {
          req.user.passes.length
    } catch (error) {
        console.log('error at 111');
        req.logout()
        res.redirect('/')
        return
    }
    
    

    if(img_status == 'pending'){
      res.redirect('/profile-picture')}
      else if(img_status == 'verification')
      {
      res.redirect('/profile-wait')
      }
      else{
          try {
               var x = req.user.username
          } catch (error) {
            req.logout()
              res.redirect('/')
          }
         User.findOne({ username : req.user.username} , (err,docs)=>
         {

          console.log(err);
          const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var dataList = []
    var messages = {
      requested : 'Approval Pending',
      approved : 'Gate Pass Generated',
      rejected : 'Approval Rejected'
    }
      
    console.log('logging 168');
    //console.log(req.user);

    for(var i=0 ; i<docs.passes.length ; i++){
  
      var d = new Date(docs.passes[i].outtime)
      var d1 = new Date(docs.passes[i].intime)
      dataList.push(
        {
          ...docs.passes[i],
          date_label : d.getDate()+' '+months[d.getMonth()],
          outtime_label : ( d.getHours() > 12 ?  d.getHours() - 12 : d.getHours() ) + ':' + d.getMinutes(),
          outtime_ampm :  d.getHours() > 11 ? 'PM' : 'AM',
          intime_label : (d1.getHours() > 12 ?  d1.getHours() - 12 : d1.getHours())  + ':' + d1.getMinutes(),
          intime_ampm :  d1.getHours() > 11 ? 'PM' : 'AM',
          status_color : docs.passes[i].status == 'requested' ? '#e8e117' :  docs.passes[i].status == 'approved' ? 'rgb(21, 212, 0)'  : 'red'  ,
          status_message : messages[docs.passes[i].status]
        }
      )
    }
    res.render('home' ,{ passlist : dataList , name : docs.name , message : flag})





         })
    
  
        }



  })

 }

app.get('/', (req, res) => {


  // try {
  //   console.log(req.user.passes[0]._id);
  // } catch (error) {
  //   console.log('caught error');
  // }
    
    if(req.isAuthenticated())
    res.redirect('/home')
    else
    res.render('login' , {message : false})
    
    
    })
    

// Handle Login

  
  app.post('/login' , (req,res)=>{

    let temp = req.body.username.toLowerCase().trim()

    if(false){
        res.redirect('/home')
    }
    else{
        let user = {
            username : temp,
            password : req.body.password,
           // passes : []
        }
        console.log('logging 219');
        console.log(user);
        req.login(user, (err)=>{
          if(err)
          console.log(err);
          else{
         // console.log(user);
           passport.authenticate('local' , {failureRedirect:"/login-error"})(req, res, ()=>{
        
            res.redirect('/home')
        
           })
        
        
          }
        })
    }
  
  
  
  
  })


//Handle Home

app.get('/success' , (req,res)=>{
      renderHome(req,res,true)
})

app.get('/home' , (req,res)=>{

  if(req.isAuthenticated()){

   
     renderHome(req,res,false)

     
   
    

}
  else
  res.redirect('/')

})



app.post('/addpass', (req,res)=>{

   var error_message = null

   if(
     req.body.location.trim() == '' ||
     req.body.purpose.trim() == '' ||
     req.body.outtime.trim() == '' ||
     req.body.intime.trim() == '' 
   ){
     error_message = 'Please fill all the required details'
   }


    var outtime = new Date(req.body.outtime)
    var intime =  new Date(req.body.intime)

    if(outtime>=intime){
      error_message = 'The In time (returning time) cannot be earlier than Out time'
    }

    if(!error_message){

      var otp = Math.floor((Math.random() * 10000) ).toString()
      if(otp.length == 3)
      otp = otp + '1'
        
      const newpass =  new Pass( {
        name : req.user.name,
        image : req.user.image,
        passcode : 'pass',
        passname : 'gatepass',
        username : req.user.username ,
        group : req.user.group,
        room : req.user.room,
        location : req.body.location,
        purpose : req.body.purpose,
        contact : req.user.contact,
        parent : req.user.parent,
        outtime : req.body.outtime,
        intime : req.body.intime,
        status : 'otp',
        image : req.user.image,
        requested_time : calcTime().toISOString(),
        otp : otp

    })
    
    

    User.findOneAndUpdate(
        { username: req.user.username }, 
        { $push: { passes: newpass  } },
       function (error, success) {
             if (error) {
                 console.log(error);
             } else {
               console.log('now logging success');
                 console.log(success);


                 // Now adding to global list

                 newpass.save()
             }
         });
         
         req.user.passes.push(newpass)
         req.login(req.user , (message)=>{
           console.log(message);
           
         })
        
         // Send OTP

         var options = {
           authorization : process.env.FAST2SMS_API_KEY,
           message : 'Your password for GatePass is: '+otp,
         //  numbers : [req.user.parent]
         }

        var message = "OTP for Gate pass is: "+otp+
        ". Your ward "+req.user.name+" has requested a gate pass. Details: "+
        "OUT Time: "+req.body.outtime.replace('T','  ')+
        " IN Time: "+req.body.intime.replace('T','  ')+
        " Location: "+req.body.location+
        " Reason: "+req.body.reason

        var options = {
          authorization : process.env.FAST2SMS_API_KEY,
          message : message,
          numbers : [req.user.parent]
        }
        if(!(req.user.name=='Test student')){
         sms.sendMessage(options).then((resp)=>{
           console.log(resp);
         }).catch((err)=>{
           console.log(err);
         })
        }

        console.log('OTP sent : ' + message);




         
         res.render('otp' , {pass : req.user.passes[req.user.passes.length - 1 ] , message : ''})
        

    }

    else{

       res.render('request' , {error : error_message , date_now : req.body.outtime})

    }

    
})


// Handle New Request


app.get('/newrequest', (req,res)=>{

   var now = calcTime().toISOString()
   res.render('request', {error: null , date_now : now})

})

// Send mail

function sendMail(email_address , otp, res , forgot){

  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'iamaditya9733@gmail.com',
      pass: process.env.GMAIL_APP_KEY
    },
    tls: {
      rejectUnauthorized: false
  }
  });
  
  var mailOptions = {
    from: 'iamaditya9733@gmail.com',
    to: email_address,
    subject: 'OTP from GatePass',
    text: 'Your password for GatePass login is : '+otp
  };
  


  transporter.sendMail(mailOptions, function(error, info){

    if(forgot){
       if(error)
       res.redirect('/forgotPassword')
       else
       res.redirect('/')
    }
    else{
             

      if (error) {
        res.render('registerUser' , {msg : 'Error occured while sending OTP' , msg_code : 'danger'})
      } else {
        console.log('Email sent: ' + info.response);
        res.render('registerUser' , {msg : 'User registered successfully. Password has been sent to mail id.' , msg_code : 'success'})
      }


    }
   
  });

}


// Register user

app.post('/register' , (req,res)=>{

 

  var password = Math.floor((Math.random() * 1000000) ) 
  User.register({
    username: req.body.uid.trim(),
    name : req.body.name,
    group : req.user.group,
    room : req.body.room,
    contact : req.body.contact,
    parent : req.body.parent,
    image : 'pending',
    hostel : req.user.group,
    role : 'student',
    mail : req.body.mail,
    passes : []
  }, password.toString().trim() , (err, user) => {
    if (err)
    {
      console.log(err);
      res.render('registerUser' , {msg : 'Error occured while registration : '+err , msg_code : 'danger'})
    }
    else {

      // Send password on mail

      const profile = new ProfileRequest({
        name : req.body.name ,
        username : req.body.uid.toLowerCase() ,
        image : 'none',
        image_status : 'pending'
       
       })
      profile.save()

      sendMail(req.body.mail , password , res , false)
    //  res.render('registerUser' , {msg : 'User registered successfully. Password sent on CU mail id : ', msg_code : 'success'})

     }})

})


// Admin register

app.post('/admin837q096w882e0/register' , (req,res)=>{

  var password = Math.floor((Math.random() * 100000000) ) 
  User.register({
    username: req.body.uid.toLowerCase(),
    name : req.body.name,
    group : req.body.group,
    room : req.body.room,
    contact : req.body.contact,
    parent : req.body.parent,
    image : 'pending',
    hostel : req.body.group,
    role : 'employee',
    passes : []
  }, password.toString(), (err, user) => {
    if (err)
    {
      console.log(err);
      res.render('admin' , {msg : 'Error occured while registration : '+err , msg_code : 'danger'})
    }
    else {

     

      const profile = new ProfileRequest({
        name : req.body.name ,
        username : req.body.uid.toLowerCase() ,
        image : 'none',
        image_status : 'pending'
       
       })
      profile.save()

    //  sendMail(req.body.uid+'@cuchd.in' , password , res)

    // Send password via sms

    var options = {
      authorization : process.env.FAST2SMS_API_KEY,
      message : 'Your GatePass Employee password is : '+password,
      numbers : [req.body.contact]
    }

    sms.sendMessage(options).then((resp)=>{
      res.render('admin' , {msg : 'Employee registered successfully : ', msg_code : 'success'})
      console.log('logging resp');
      console.log(resp);
    }).catch((err)=>{
      res.render('admin' , {msg : 'Error : ' + err, msg_code : 'danger'})
      console.log(err);
    })

     }})

})

// Handle Pass QR

app.get('/passqr',(req,res)=>{

 
   res.render('passqr' , {passqrurl : 
    
    'https://chart.googleapis.com/chart?cht=qr&chl='+req.query.passid+'&chs=500x500&chld=L|0'
    })
})



// Handle Warden page

app.get('/warden' , (req,res)=>{


  if(req.isAuthenticated() && req.user.role == 'employee'){


    if(req.query.filter == 'all'){

      Pass.find({group : req.user.group} , (err,docs)=>{
       
        res.render('manage-requests' , {passes : docs , filter : req.query.filter , profiles : {} , group : req.user.group} )
        
       })

    }
    else if(req.query.filter == 'profile'){
      ProfileRequest.find({ image_status : 'verification' , group : req.user.group} , (err,docs)=>{
       
        res.render('manage-requests' , {profiles : docs , filter : 'profile' , passes : {} , group : req.user.group})
  
        
       })
    }
    else if(req.query.filter == 'late_entry'){
      Pass.find({late_entry : 'yes' , group : req.user.group} , (err,docs)=>{
       
        res.render('manage-requests' , {passes : docs , filter : req.query.filter , profiles : {} , group : req.user.group} )
        
       })
    }
    else{
      Pass.find({ status : req.query.filter , group : req.user.group} , (err,docs)=>{
       
        res.render('manage-requests' , {passes : docs , filter : req.query.filter , profiles : {} , group : req.user.group})
  
        
       })
    }
     
  }

  else{
    res.redirect('/warden-login')
  }


})


// Handle warden decision

app.get('/decision' , (req,res)=>{

 // console.log(req.query);

  if(req.query.decision == 'Accept'){
    console.log(req.query.passid);
   

    Pass.findByIdAndUpdate(req.query.passid.trim() , {status : 'approved'} , (err,doc)=>{
      
    })

    User.updateOne({'passes._id': ObjectId(req.query.passid.trim()) }, {'$set': {
      'passes.$.status': 'approved'
  }}, function(err) { 
    res.send({code : 1 , id : req.query.passid})
   }  )



  }
  else if(req.query.decision == 'AcceptProfile'){
    console.log('logging decision');
    console.log(req.query.passid);
      ProfileRequest.findOneAndUpdate({username : req.query.passid} , {image_status : 'approved'} ,
      (err)=>{

        console.log(err);
        
      })
      res.send({code : 1 , id : req.query.passid})
  }
  else if(req.query.decision == 'RejectProfile'){
    ProfileRequest.findOneAndUpdate({username : req.query.passid} , {image_status : 'pending'} ,
      (err)=>{
        console.log(err);
      }
    )
    res.send({code : 1 , id : req.query.passid})
    }
    else if(req.query.decision == 'Checked'){

      Pass.findByIdAndUpdate(req.query.passid.trim() , {late_entry : 'checked'} , (err,doc)=>{
        console.log(err);
        res.send({code : 1 , id : req.query.passid})

      
      })
             
    }
  else{

    Pass.findByIdAndUpdate(req.query.passid.trim() , {status : 'rejected'} , (err,doc)=>{
      
    })

    User.updateOne({'passes._id': ObjectId(req.query.passid.trim()) }, {'$set': {
      'passes.$.status': 'rejected'
  }}, function(err) { 
    res.send({code : 1 , id : req.query.passid})
   }  )


  }


  
})




app.get('/getText' , (req,res)=>{

  res.send('Heyy from server')
})


app.get('/fetch' , (req,res)=>{
  res.sendFile(__dirname + '/fetch.html')
})



// Register new user

app.get('/warden/register' , (req,res)=>{
   res.render('registerUser', {msg : null })
})

// Handle Otp

app.get('/otp' , (req,res)=>{
  res.render('otp')
})

// Handle Profile Picture 

app.get('/profile-picture' , (req,res)=>{

  if(req.isAuthenticated())
  res.render('profile-picture')
  else
  res.redirect('/')
})

// Handle Picture Upload

app.post('/profile-upload' , (req,res)=>{
  
  if(req.isAuthenticated())
  {
  User.findOneAndUpdate(
    { username: req.user.username }, 
    { image: req.body.image_id},
   function (error, success) {
            ProfileRequest.findOneAndUpdate({username : req.user.username} , {image_status : 'verification' , image: req.body.image_id , room : req.user.room , group: req.user.group} , (err)=>{
              console.log(err);

              res.redirect('profile-wait');
            })
     });
    }
    else
    res.redirect('/')

})


// Handle after Photo Upload

app.get('/profile-wait' , (req,res)=>{
      res.render('profile-wait.ejs')
})


// Handle otp-verification

app.post('/otp-verification' , (req,res)=>{

      Pass.findById(  req.body.passid.trim(), (err, doc)=>{
        console.log(err);
        console.log('loggin 597');
       // console.log(req.body);
          if((req.body.otp == doc.otp) || req.user.name=='Test student'){
              Pass.findByIdAndUpdate(req.body.passid.trim() , {status : 'requested'} , (err)=>{
                console.log(err);

                // Now updating user's copy

                User.updateOne({'passes._id': ObjectId(req.body.passid.trim()) }, {'$set': {
                  'passes.$.status': 'requested'
              }}, function(err) { 
                     res.redirect('/success')
               }  )

                
              })
          }
          else{
              res.render('otp' , {pass : req.user.passes[req.user.passes.length - 1 ] , message : 'wrong otp'})
          }
      } )
})


app.get('/warden/editUser' , (req,res)=>{

       User.findOne({username : req.query.uid.toLowerCase().trim()} , (err,doc)=>{
         console.log(err);

         if(!err && doc){
         console.log(doc.name);
         res.render('editUser',
         {
           name : doc.name,
           uid : doc.username,
           room : doc.room,
           contact : doc.contact,
           parent : doc.parent,
           hostel : doc.hostel,
           msg : null ,
           msg_code : 'success'
         }
         
         )
         }
         else{
           
          res.render('editUser' , {
            name : '',
            uid : '',
            room : '',
            contact : '',
            parent : '',
            hostel : '',
            msg : 'User not found' , msg_code : 'danger'})
         

         }
       })
       
})


app.post('/update-user-details', (req,res)=>{
  console.log(req.body);
     
     User.findOneAndUpdate({username : req.body.original.trim().toLowerCase()},{
       username : req.body.uid.trim().toLowerCase(),
       hostel : req.body.hostel.trim().toUpperCase(),
       contact : req.body.contact,
       parent : req.body.parent,
       room : req.body.room.trim().toUpperCase(),
       name : req.body.name.trim().toUpperCase()
     }, (err,doc)=>{
         console.log(err);
         if(doc)
         {
           console.log(doc);
           res.render('editUser' , {
            name : '',
            uid : '',
            room : '',
            contact : '',
            parent : '',
            hostel : '',
            msg : 'User details updated successfully' , msg_code : 'success'})
         }
         else{
          res.render('editUser' , {
            name : '',
            uid : '',
            room : '',
            contact : '',
            parent : '',
            hostel : '',
            msg : 'User not found' , msg_code : 'danger'})
         }
     })
})
// Handle Login error



// Get info of a pass on Guard Pass

app.get('/pass-info' , (req,res)=>{

  //console.log(req);
     
     Pass.findById(req.query.passid.trim() , (err,doc)=>{
       console.log(doc);
       
       var result = {};

       try{
           result = {
         ...doc._doc,
       }

       result['passid'] = result._id.toString()
       delete result._id
       delete result.__v
      }
      catch(err){

      }
      

       var now = calcTime()
       var entry_exit_status ;
       var entry_exit_color ;
      console.log('Logging res');
      console.log(result.name);
       if(result.name){

          if(result.status == 'completed'){
            
            entry_exit_status = 'PASS ALREADY USED'
            entry_exit_color = 'red'

            
          }

      

       if(result.actual_out_time && result.status!='completed'){
        Pass.findByIdAndUpdate(result.passid.trim() , {actual_in_time : now , status : 'completed'} , (err,doc)=>{
          console.log(err);
          console.log('In time logged successfully');
        })

          if(now > new Date(result.intime)){
            entry_exit_status = 'LATE ENTRY'
            entry_exit_color = 'red'

            Pass.findByIdAndUpdate(result.passid.trim() , {late_entry : 'yes'} , (err,doc)=>{
              console.log(err);

            })


          }
          else{
               entry_exit_status = 'Student IN'
               entry_exit_color = 'green'
          }
       }
       else if( result.status!='completed'){
        Pass.findByIdAndUpdate(result.passid.trim() , {
          actual_out_time : now
        } , (err,doc)=>{
          console.log(err);
          console.log('Out time logged successfully');
        })
           if(now > new Date(result.outtime)){
            entry_exit_status = 'OUT Time has passed'
            entry_exit_color = 'red'
           }
           else{
            entry_exit_status = 'Student OUT'
            entry_exit_color = 'green'
           }
       }
       try{  result['intime'] = new Date(result['intime']).toLocaleString() }catch(err){}
       try{  result['outtime'] = new Date(result['outtime']).toLocaleString() }catch(err){}
       try{  result['actual_in_time'] = new Date(result['actual_in_time']).toLocaleString("en-US", {timeZone: "Asia/Kolkata"}) }catch(err){}
       try{   result['actual_out_time'] = new Date(result['actual_out_time']).toLocaleString("en-US", {timeZone: "Asia/Kolkata"}) }catch(err){}

      }
      else{
        entry_exit_status = 'INVALID PASS'
        entry_exit_color = 'red'
      }
       try{ result['entry_exit_status'] = entry_exit_status }catch(err){}
       try{   result['entry_exit_color']  = entry_exit_color }catch(err){}
      
      console.log(result);
      res.send(result)
     })
})

// Guard login









// Forgot Password Get


app.get('/forgotPassword' , (req,res)=>{
      res.render('forgotPassword')
})

// Forgot Password Backend

app.post('/forgotPassword' , (req,res)=>{
       
       if(! (req.body.mail))
       res.redirect('/forgotPassword')

       var mail_id = req.body.mail
       var password = Math.floor((Math.random() * 1000000) ).toString()
       
       User.findOne({username : req.body.uid.toLowerCase()} , (err,doc)=>{
                      console.log(err);
                      console.log('logging doc');
                       console.log(doc);
                    if(doc){
                      doc.setPassword( password , function(err, user){
                                 console.log(err);
                                 doc.save()
                                 sendMail(mail_id , password , res , true)
                      })
                    }
                    else{
                      res.redirect('/forgotPassword')
                      return
                    }
       })
       
    





})

// Admin

app.get('/admin837q096w882e0' , (req,res)=>{
         res.render('admin' , {msg : 'Admin Console' , msg_code : 'success'})
})

// Handle logout

app.post('/logout' , (req,res)=>{

  req.logout()
  res.redirect('/')
})
    












    //


    app.get('/login-error' , (req,res)=>{
      res.render('login' , {message : true})
})





app.get('/guard-login' , (req,res)=>{
 
  
  let user = {
    username : req.query.username.toLowerCase(),
    password : req.query.password,
   // passes : []
     }
    req.login(user, (err)=>{
    if(err)
    console.log(err);
    else{
   // console.log(user);
     passport.authenticate('local' , {failureRedirect:"/login-error-guard"})(req, res, ()=>{

      if(req.isAuthenticated() && req.user.role == 'employee')
      {
      res.send({login:'yes'})
      
      }
      
  
     })
  
  
    }
  })



})





app.get('/warden-login' , (req,res)=>{
  
  res.render('warden-login')

})

app.post('/warden-login' , (req,res)=>{
  
  let user = {
    username : req.body.username.toLowerCase(),
    password : req.body.password,
  
}

req.login(user, (err)=>{
  if(err)
  console.log(err);
  else{
 // console.log(user);
   passport.authenticate('local' , {failureRedirect:"/warden-login"})(req, res, ()=>{
    
    res.redirect('/warden?filter=requested')

   })


  }
})

})




//Server initialized
app.listen(process.env.PORT || 3000)