const qbittorrent = require('./services/qbittorrent');

let qb = new qbittorrent('https://bt.xiaolin.in','xxx');

setInterval(() => {
    qb.getTorrentList().then((res) => {
        //console.log(res.body);

        let data = JSON.parse(res.body);
        if (!data)
            return;
        
        data.forEach((item) => {
            console.log('');
            console.log(item.hash);
            console.log(item.name);
            console.log(item.progress);
            console.log(item.ratio);
            console.log(item.state);

            if (item.state !== 'downloading' && item.state !== 'pausedUP' && item.progress === 1 && item.ratio >= 0.35)
            {
                qb.pauseTorrent(item.hash).then(() => {});
            }
        });
    })
},2000);


qb.addTorrentLink('https://xxx.torrent').then((res) => {
    console.log(res.body);
    console.log(res.statusCode);
});