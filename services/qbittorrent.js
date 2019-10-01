const request = require('request');
const querystring = require('querystring');

class qbittorrent {
    constructor(baseURL, SID) {
        this._baseURL = baseURL;
        this._SID = SID;

        this.addNewCategory('TorrentManager').then((res) => {});
    }

    getRequestPromise(uri)
    {
        return new Promise((resolve, reject) => {
            request({
                method: 'get',
                url: this._baseURL + uri,
                headers: {
                    'Cookie': `SID=${this._SID}`,
                },
            },(error, response, body) => {
                if (error)
                    reject(error);

                resolve(response);
            });
        });
    }

    postRequestPromise(uri, body, type = 'application/x-www-form-urlencoded', formData = {})
    {
        return new Promise((resolve, reject) => {
            let data = {
                method: 'post',
                url: this._baseURL + uri,
                headers: {
                    'Content-Type': type,
                    'Cookie': `SID=${this._SID}`,
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

    getTorrentList()
    {
        return this.getRequestPromise('/query/torrents?limit=10000&category=TorrentManager');
    }

    getTorrentInfo(hash)
    {
        return this.getRequestPromise('/query/propertiesGeneral/' + hash);
    }

    getTorrentContent(hash)
    {
        return this.getRequestPromise('/query/propertiesFiles/' + hash);
    }

    addTorrentLink(url)
    {
        return this.postRequestPromise('/command/download', '','multipart/form-data',{
            urls: url,
            category: 'TorrentManager',
        });
    }

    addNewCategory(name)
    {
        return this.postRequestPromise('/command/addCategory', querystring.stringify({category: name}));
    }

    pauseTorrent(hash)
    {
        return this.postRequestPromise('/command/pause', querystring.stringify({hash: hash}));      
    }
}

module.exports = qbittorrent;