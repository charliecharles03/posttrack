const fs = require('fs');
const axios = require('axios');
const newman = require('newman');

/*
const testrailUrl = process.env.TESTRAIL_URL;
const testrailUser = process.env.TESTRAIL_USER;
const testrailApiKey = process.env.TESTRAIL_API_KEY;
const projectId = process.env.PROJECT_ID;
const suiteId = process.env.SUITE_ID;

*/

const testrailUrl = "https://piratescompany.testrail.io";
const testrailUser = "cloud9stark@gmail.com";
const testrailApiKey = "D1zPQ/e61XJCvLDcDW1p-oyktZk1hnbUdOFS6id4D";
const projectId = "1";
const suiteId = "1";


// Create json file with Postman collection and environment

async function runPostmanCollection() {
  return new Promise((resolve, reject) => {
    newman.run({
      collection:('./PostMan/DC.json'),
      reporters: ['cli','ctrf-json'],
      reporter: {
        json: {
          export: './ctrf/ctrf-report.json'
        }
      }
    }, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}



async function createTestRun() {
  try {
    const response = await axios.post(
      `${testrailUrl}/index.php?/api/v2/add_run/${projectId}`,
      {
        suite_id: suiteId,
        name: `Automated Test Run - ${new Date().toISOString()}`, // You can modify the name
        include_all: true,
      },
      {
        auth: {
          username: testrailUser,
          password: testrailApiKey
        }
      }
    );
    console.log(`Test run created: ${response.data.id}`);
    return response.data.id;
  } catch (error) {
    console.error('Error creating test run:', error);
    process.exit(1);
  }
}

function extractTestRailCaseId(postmanTestName) {
    console.log("postmanTestName",postmanTestName);
    var first_string = "";

    for(var i=0;i<postmanTestName.length;i++){
       first_string += postmanTestName[i];
        if(postmanTestName[i] == " "){
            break;
        }
    }
    console.log("first_string",first_string);
    return first_string.substring(1,first_string.length-1);
}

async function extractResults() {
    const newmanReport = JSON.parse(fs.readFileSync('./ctrf/ctrf-report.json', 'utf8'));
    const results = newmanReport.results.tests.map(test => {
        const caseID = extractTestRailCaseId(test.name);
        if(caseID){
            return {
                case_id: caseID,
                status_id: test.status === 'passed' ? 1 : 5,
                comment: test.message ? test.message : "success",
            };
        }else{
            console.log("caseID not found");
            return null;
        }
    }).filter(result => result !== null);
    return results;
}

async function sendResultsToTestRail(testRunId, results) {
    for(const result of results){
        try {
            await axios.post(
                `${testrailUrl}/index.php?/api/v2/add_result_for_case/${testRunId}/${result.case_id}`,
                {
                    status_id: result.status_id,
                    comment: result.comment
                },
                {
                    auth: {
                        username: testrailUser,
                        password: testrailApiKey
                    }
                }
            );
            console.log(`Result for case ${result.case_id} sent`);
        } catch (error) {
            console.error(`Error sending result for case ${result.case_id}:`, error);
        }
    }
}

(async function main() {
    try{
        await runPostmanCollection();
        const testRunId = await createTestRun();   // extract new testid
        var result  = await extractResults();   // extract results
        console.log("result",result);           
        await sendResultsToTestRail(testRunId, result);
    }
    catch(err){
        console.log("error",err);
    }
})();




