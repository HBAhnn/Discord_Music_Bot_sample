const Discord = require('discord.js');
const client = new Discord.Client();
const config = require("./token.json");
const ytdl = require('ytdl-core');

const queue = new Map();
const prefix = config.prefix


client.on('ready', () => {
  console.log(`${client.user.tag}에 로그인하였습니다!`);
});

client.on('message', async msg => {
  
  if(msg.author.bot) return;
  if(!msg.content.startsWith(prefix)) return;

  const serverQueue = queue.get(msg.guild.id);

  const args = msg.content.slice(config.prefix.length).split(" ");

  const command = args.shift(); //명령어
  const todo = args.shift(); //원하는 음악의 이름

  if(command == 'play'){
    execute(msg, serverQueue);
    return;
  }else if(command == 'skip'){
    skip(msg, serverQueue);
    return;
  }else if(command == 'now'){
    now_playing(msg, serverQueue);
    return;
  }else if(command == 'list'){
    play_list(msg, serverQueue);
    return;
  }else if(command == 'shuffle'){
    shuffle(msg, serverQueue);
    return;
  }else if (command === 'local') {
    if (msg.member.voice.channel) {
      msg.member.voice.channel.join()
        .then(connection => { 
          console.log('playing!')
          const dispatcher = connection.play(require("path").join(__dirname, './music/' + todo + ".mp3"));
          dispatcher.on("end", end => {});
        })
        .catch(console.log);
    } else {
      msg.reply('Please join the channel first');
    }
  }

  if(msg.content == "!stop"){
    if (msg.member.voice.channel) {
      serverQueue.songs = [];      
      serverQueue.connection.dispatcher.end();
      msg.reply('Stop the music');
    } else {
      msg.reply('Already done');
    }
  }

});

async function execute(message, serverQueue) {
  const args = message.content.split(" ");

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      'Please join the channel first'
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "I need the permissions to join and speak in your voice channel!"
    );
  }
  const songInfo = await ytdl.getInfo(args[1]); //URL에서 정보 가져오기
  const song = {
      title: songInfo.videoDetails.title,
      url: songInfo.videoDetails.video_url,
  };

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 2,
      playing: true
    };

    queue.set(message.guild.id, queueContruct);

    queueContruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  }else {
   serverQueue.songs.push(song);
   return message.channel.send(`${song.title} has been added to the queue!`);
  }
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }
  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  if (!serverQueue)
    return message.channel.send("There is no music that I could skip!");
  serverQueue.connection.dispatcher.end();
}

function now_playing(message, serverQueue) {

  
  if (!serverQueue)
    return message.channel.send("There is no music to show!");
  else
    return message.channel.send(`Now playing: ${serverQueue.songs[0].title}`);
}

function play_list(message, serverQueue) {

  if (!serverQueue)
    return message.channel.send("There is no music to show!");
  else{
    var leng = serverQueue.songs.length;
    var list_message = " ";
    list_message += serverQueue.songs[0].title;
    list_message += "\n";
    for(var i = 1 ; i < leng ; i++){
      list_message += i + " : ";
      list_message += serverQueue.songs[i].title;
      list_message += "\n";
    }
    return message.channel.send(`Now playing: ${list_message}`);
  }
}

function shuffle(message, serverQueue) {

  if (!serverQueue)
  {
    return message.channel.send("There is no music to show!");
  }else if(serverQueue.songs.length <= 1){
    return message.channel.send("Not enough songs to shuffle!");
  }else{
    var leng = serverQueue.songs.length;
    for(var i = 1 ; i < leng - 1 ; i++){
      let j = 1 + Math.floor(Math.random() * i);
      [serverQueue.songs[i], serverQueue.songs[j]] = [serverQueue.songs[j], serverQueue.songs[i]];
    }
    return message.channel.send(`Shuffle Complete!`);
  }
}

//serverQueue.songs.length

client.login(config.BOT_TOKEN); // token으로 discord API에 Identify 전송