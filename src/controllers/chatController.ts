exports.getChats = async (req, res) => {
    /*let user = req.body;

    // let chats = await Chat.find({ users: {
    //   $elemMatch: {
    //     userId: user._id
    //   }
    // }
    // }).sort({ created: -1});
    let chats = await Chat.find({
        $or: [{
            'users.userFrom.userId': user._id
        }, {
            'users.userTo.userId': user._id
        }]
    }).sort({ created: -1});
    res.status(200).send(chats);*/
};

exports.createChat = async (req, res) => {
    /*let body = req.body;

    let room;
    let userFrom = body.users.userFrom;
    let userTo = body.users.userTo;

    if (userFrom.userName.toLowerCase() < userTo.userName.toLowerCase()) {
        room = "" + userFrom.userId + "" + userTo.userId;
    } else {
        room = "" + userTo.userId + "" + userFrom.userId;
    }
    let checkChat = await Chat.findOne({room: room});

    if(checkChat) {
        res.status(200).send(checkChat);
    } else {
        let newChat = new Chat();
        newChat.users.userFrom = userFrom;
        newChat.users.userTo = userTo;
        newChat.created = Date.now();
        newChat.room = room;
        newChat.lastMessage = null;
        newChat.lastMessageDate = null;
        let savedChat = await newChat.save();
        res.status(200).send(savedChat);
    }*/
};

exports.getMessagesNotSeen = async (req, res) => {
    /*let user = req.body;

    let messages = await Message.find({to: user._id, seen: false});
    res.status(200).send({number: messages.length});*/
};

exports.lastView = async (req, res) => {
    /*let body = req.body;
    let update = await Chat.updateOne({room: body.room, "users.userId": ObjectId(body.user)}, {
        $set: {
            "users.$.lastView": body.lastView
        }
    });

    await Message.updateMany({room: body.room, to: body.user, seen: false}, {seen: true});

    res.status(200).send({okey: 'ok'});*/
};

exports.getMessages = async (req, res) => {
    /*let body = req.body;
    let msgs = await Chat.findOne({ room: body.room }, { messages: 1 });

    let messages = [];

    if(msgs && msgs.messages) {
        for(let i = 0 ; i < msgs.messages.length; i++){
            let message = await Message.findOne({ _id: msgs.messages[i] });
            messages.push(message);
            if(i === msgs.messages.length -1) {
                res.status(200).send({messages: messages});
            }
        }
    } else {
        res.status(200).send({messages: messages});
    }*/
};

exports.getChatRoomById = async (req, res) => {
    /*let room = req.body.room;

    let chat = await Chat.find({room: room});

    res.status(200).send(chat);*/
};

exports.getChatRoom = (req, res) => {
    /*let users = req.body;

    console.log('ussers', users);

    let room;
    if (users.userFrom.userName && users.userTo.userName) {
        if (users.userFrom.userName.toLowerCase() < users.userTo.userName.toLowerCase()) {
            room = "" + users.userFrom.userId + "" + users.userTo.userId;
        } else {
            room = "" + users.userTo.userId + "" + users.userFrom.userId;
        }
    }
    res.status(200).send({
        room: room
    });*/
};

exports.getUsers = async (req, res) => {
    /*let body = req.body;

    let users = [];

    await Athlete.find({name: {$regex : ".*" + body.name}}).then(async athletes => {
        users = users.concat(athletes);
        await Coach.find({name: {$regex : ".*" + body.name}}).then(coaches => {
            users = users.concat(coaches);
            res.status(200).send(users);
        }).catch(error => res.status(400).send({error: error}));
    }).catch(error => res.status(400).send({error: error}));*/
};