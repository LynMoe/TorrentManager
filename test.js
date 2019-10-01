const onedrive = require('./services/onedrive');

let od = new onedrive('');

setTimeout(() => {
    od.uploadFile('./test.mp4','/7.mp4');
},3000);