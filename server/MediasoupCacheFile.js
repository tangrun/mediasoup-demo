const fs = require('fs');
const crypto = require('crypto');
const http = require('http');
const https = require('https');

const rootDir = './node_modules/mediasoup/worker/subprojects/';
const cacheDir = `${rootDir}./packagecache/`;
const localCacheDir = './packagecache/';

const regExp = /(\S+) = (\S+)/g;

async function main()
{

	if (!fs.existsSync(cacheDir))
		fs.mkdirSync(cacheDir);

	const downloadInfo = fs.readdirSync(rootDir)
		.filter((v) => 
		{ // 过滤非配置文件
			return v.endsWith('.wrap');
		})
		.map((v) => 
		{ // 读取内容
			const readContent = fs.readFileSync(`${rootDir}${v}`, 'utf-8');

			const result = {};
			let matchResult = null;

			while ((matchResult = regExp.exec(readContent))) 
			{
				result[matchResult[1]] = matchResult[2];
			}

			return result;
		})
		.flatMap((v) => 
		{ // 下载信息
			const list = [];

			if (v['source_url'] && v['source_filename'] && v['source_hash']) 
			{
				list.push({
					url      : v['source_url'],
					filename : v['source_filename'],
					hash     : v['source_hash']
				});
			}
			if (v['patch_url'] && v['patch_filename'] && v['patch_hash']) 
			{
				list.push({
					url      : v['patch_url'],
					filename : v['patch_filename'],
					hash     : v['patch_hash']
				});
			}
			list.forEach((value) => 
			{
				try 
				{
					const SHA256 = crypto.createHash('sha256');

					SHA256.update(fs.readFileSync(`${localCacheDir}${value.filename}`));
					const sha256 = SHA256.digest('hex');

					value.localCache = sha256 === value.hash;
				}
				catch (e) 
				{
					value.localCache = false;
				}
			});

			return list;
		});

	for (const value of downloadInfo)
	{
		if (value.localCache)
		{
			console.log(`${value.filename}使用本地缓存`);
		}
		else
		{
			console.log(`${value.filename}开始下载`);
			const writeStream = fs.createWriteStream(`${localCacheDir}${value.filename}`);
			
			try 
			{
				await download(value.url, writeStream);
				console.log(`${value.filename}下载完成`);
			}
			catch (e) 
			{
				console.log(`${value.filename}下载失败`);
				throw e;
			}
		}
	}
	
	downloadInfo
		.forEach((value) => 
		{
			console.log(`${value.filename}开始复制`);
			fs.copyFileSync(`${localCacheDir}${value.filename}`, `${cacheDir}${value.filename}`);
			console.log(`${value.filename}复制完成`);
		});

}

function download(url, writerSteam) 
{
	const protocol = (url.startsWith('https') ? https : http);

	return new Promise(((resolve, reject) => 
	{

		protocol.get(url, (res) => 
		{
			if (res.statusCode === 200) 
			{
				const len = Number.parseInt(res.headers['content-length']);
				let currentLen = 0;

				res.on('data', (data) => 
				{
					currentLen = currentLen + data.length;
					writerSteam.write(data);
					console.log(`downloading: ${url}  ${currentLen}/${len}`);
				});

				res.on('end', () => 
				{
					resolve();
				});
			}
			else if (res.statusCode === 301 || res.statusCode === 302) 
			{
				const promise = download(res.headers['location'], writerSteam);

				promise.then((value) => 
				{
					resolve(value);
				}).catch((e) => 
				{
					console.log(e);
					reject(e);
				});
			}
			else 
			{
				console.log(res.statusMessage);
				reject(res.statusMessage);
			}

		}).on('error', (e) => 
		{
			console.log(e);
			reject(e);
		});
	}));

}

main();