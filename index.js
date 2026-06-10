const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const cors = require('cors')

const port = 5000
app.use(cors())
app.use(express.json())
const uri = process.env.MONGO_DB_URI

app.get('/', (req, res) => {
  res.send('Hello World!')
})








const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const database = client.db('hire-loop-website')
    const jobCollection = database.collection('jobs')
    const companyCollection = database.collection('companies')
    const userCollection = database.collection('user')

    // JOB RELATED APIS

    app.get('/api/users',async(req,res)=>{
      const cursor = userCollection.find().skip(3)
      const result = await cursor.toArray()
      res.send(result)
    })



     // GET API for getting the company individual company jobs

    app.get('/api/jobs',async(req,res)=>{
        const query = {};
        if (req.query.companyId) {
            query.companyId = req.query.companyId
            
        }
        if (req.query.status) {
            query.status = req.query.status
            
        }
        const cursor = jobCollection.find(query)
        const result = await cursor.toArray()
        res.send(result)

    })



    // POST
    app.post('/api/jobs',async (req,res)=>{
        const job = req.body
        const newJob ={
          ...job,
          createdAt: new Date()
        }
        const result = await jobCollection.insertOne(newJob)
        res.send(result)

    })
   

    // COMPANY RELATED APIS
    // Post 
    app.post('/api/companies',async(req,res)=>{
        const company = req.body
        const newCompany = {
          ...company,
          createdAt: new Date()
        }
        const result = await companyCollection.insertOne(newCompany)
        res.send(result)

    })

    // Get the company
    
    app.get('/api/my/companies',async(req,res)=>{
        const {recruiterId} = req.query
  
          if (!recruiterId) {
        return res.status(400).json({
            message: 'recruiterId is required'
        });
    }
        const result = await companyCollection.findOne({recruiterId})
        res.send(result || {})


    })

    // get all companies
    app.get('/api/companies',async(req,res)=>{
      const cursor =  companyCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })









    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})