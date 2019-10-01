const request = require('request');
const querystring = require('querystring');
const fs = require('fs');
const urlencode = require('urlencode');
const splitFileStream = require("split-file-stream");

class onedrive
{
    constructor(refresh_token = '') {
        this._client_id = '5556ca07-9af0-4faf-9c7e-04e7a865e504';
        this._client_secret = 'clt9YXW2A0yFfJ[xeMod7eqCBBcLz./@';
        this._redirect_uri = 'http://localhost/';
        this._refresh_token = refresh_token;
        if (fs.existsSync(__dirname + '/../data/token.json'))
        {
            let data = fs.readFileSync(__dirname + '/../data/token.json');
            data = JSON.parse(data);
            if (data && data.refresh_token.length > 10)
            {
                this._refresh_token = data.refresh_token;
            }
        }
        this._token = '';
        this._chunk_size = 327680 * 100;

        this.refreshToken();
        setInterval(() => {
            this.refreshToken();
        },1000 * 60 * 5);
    }

    getRequestPromise(url, headers = {})
    {
        return new Promise((resolve, reject) => {
            request({
                method: 'get',
                url: url,
                headers: headers,
            },(error, response, body) => {
                if (error)
                    reject(error);

                resolve(response);
            });
        });
    }

    postRequestPromise(url, body, type = 'application/x-www-form-urlencoded', formData = {})
    {
        return new Promise((resolve, reject) => {
            let data = {
                method: 'post',
                url: url,
                headers: {
                    'Content-Type': type,
                    'Authorization': `Bearer ${this._token}`,
                },
            };

            if (type === 'application/x-www-form-urlencoded')
                data.body = body;
            else 
                data.formData = formData;

            request(data,(error, response, body) => {
                if (error)
                    reject(error);

                resolve(response);
            });
        });
    }

    createUploadSession(filename)
    {
        return this.postRequestPromise(
            `https://graph.microsoft.com/v1.0/me/drive/root:${urlencode(filename)}:/createUploadSession`,
            '{"@microsoft.graph.conflictBehavior":"replace"}','application/json; charset=utf-8'
        );
    }

    sendDataChunk(url, chunkpath, chunknum, filesize, retry = 0)
    {
        // console.log('');
        // console.log(chunknum);
        // console.log(chunkpath[chunknum]);
        if (!chunkpath[chunknum])
            return;
        let fileInfo = fs.statSync(chunkpath[chunknum]);
        let end, finished = false;
        if ((chunknum + 1) * this._chunk_size - 1 >= filesize)
        {
            end = filesize - 1;
            finished = true;
        }
        else 
            end = (chunknum + 1) * this._chunk_size - 1;

        // console.log(fileInfo.size);
        console.log(`bytes ${chunknum * this._chunk_size}-${end}/${filesize}`);


        request({
            method: 'put',
            url: url,
            headers: {
                Authorization: `Bearer ${this._token}`,
                'Content-Length': fileInfo.size,
                'Content-Range': `bytes ${chunknum * this._chunk_size}-${end}/${filesize}`,
            },
            body: fs.createReadStream(chunkpath[chunknum]),
        },(error,response,body) => {
            let nextNum = chunknum;

            if (retry < 3 && (error || !JSON.parse(body) || JSON.parse(body).error))
            {
                retry++;
            } else if (retry == 3) {
                console.log('Upload Failed');
                this.deleteChunks(chunkpath);
                return;
            } else {
                nextNum++;
                retry = 0;
            }

            // console.log(error);
            // console.log(body);
            // console.log(response.statusCode);

            if (response.statusCode == 201 || response.statusCode == 200)
            {
                console.log('Upload Successfully');
                this.deleteChunks(chunkpath);
            }

            if (!finished)
                return this.sendDataChunk(url,chunkpath,nextNum,filesize,retry);
            else
                return body;
            
        });
    }

    deleteChunks(chunkpath)
    {
        chunkpath.forEach((item) => {
            fs.unlinkSync(item);
        });
        return true;
    }

    uploadFile(filepath, filename)
    {
        this.createUploadSession(filename).then((res) => {
            let data = JSON.parse(res.body);
            if (!data || !data.uploadUrl)
                return false;
            let filesize = fs.statSync(filepath).size;

            splitFileStream.split(fs.createReadStream(filepath), this._chunk_size, __dirname + '/../tmp/' + Math.floor(Math.random() * Math.floor(100000)), (filePaths) => {
                console.log(data.uploadUrl);
                new Promise((resolve,reject) => {
                    this.sendDataChunk(data.uploadUrl,filePaths,0,filesize);
                }).then((body) => {
                    console.log(body);
                    if (body = JSON.parse(body) && body.webUrl)
                        console.log('Upload successfully');
                });
            });
        });
    }

    refreshToken()
    {
        return this.postRequestPromise('https://login.microsoftonline.com/common/oauth2/v2.0/token',querystring.stringify({
            client_id: this._client_id,
            client_secret: this._client_secret,
            scope: 'offline_access user.read Files.ReadWrite.All',
            refresh_token: this._refresh_token,
            redirect_uri: this._redirect_uri,
            grant_type: 'refresh_token',
        })).then((res) => {
            console.log(res.body);
            let data = JSON.parse(res.body);
            if (!data)
                return;
            this._token = data.access_token;
            this._refresh_token = data.refresh_token;

            fs.writeFileSync(__dirname + '/../data/token.json', JSON.stringify({
                'refresh_token': data.refresh_token,
            }), 'utf8');
        });
    }
}

module.exports = onedrive;