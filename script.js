var jsforce = require('jsforce');
var fs = require('fs');
var path = require('path');
var fetch = require("node-fetch");

run();
async function run(){
    console.log("starting the execution");
    let creds = JSON.parse(fs.readFileSync(path.resolve(__dirname, './salesforce-creds.json')).toString());
    let conn = new jsforce.Connection({
        loginUrl: creds.url
    });
    try {
        await conn.login(creds.username, creds.password);
        console.log("Connected to Salesforce");
        let soql = `select id,ParentId, LatestPublishedVersion.PathOnClient, LatestPublishedVersion.VersionData from ContentDocument where LatestPublishedVersionId in (select RecordId from FeedAttachment )`;
        let accounts = [];
        let query = await conn.query(soql)
            .on("record", (record)=>{
                accounts.push(record);
                console.log(record.LatestPublishedVersion);
                if (!record.LatestPublishedVersion){
                    console.log("some error as no latest version");
                    return;
                }
                const filename = record.LatestPublishedVersion.PathOnClient;
                console.log(filename);
                const dataPath = record.LatestPublishedVersion.VersionData;
                headers = {
                    'Authorization': 'Bearer ' + conn.accessToken,
                    'Content-Type': 'blob'
                };
                options = {
                    method: 'GET',
                    headers: headers
                };
                fetch(conn.instanceUrl + dataPath, options)
                    .then(result => {
                        console.log('got file');
                        result.body.pipe(fs.createWriteStream(`./files/${filename}`));
                    })
                    .catch(error => {
                        console.log(error);
                    })
            })
            .on("end", async () => {
                console.log(`Fetched total of ${accounts.length} account records` );
            })
            .on("error", (err) => {
                console.log(err);
            })
            .run({
                autoFetch: true,
                maxFetch: 2000
            });
        //console.log(accounts);

        await conn.logout();
    } catch (err) {
        console.log(err);
    }



}