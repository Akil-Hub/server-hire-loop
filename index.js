const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const cors = require('cors')

const port = 5000
app.use(cors())
app.use(express.json())
const uri = process.env.MONGO_DB_URI

app.get('/', (req, res) => {
  res.send('Hello World!')
})


// middlewares 

const logger = (req, res, next) => {
  console.log('logger logged middleware is actevated', req.params)
  next()

}





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
    const planCollection = database.collection('plans')
    const subscriptionCollection = database.collection('subscriptions')

    const applicationCollection = database.collection('applications')
    const sessionCollection = database.collection('session')


    // Vefiry toekn 

    const verifyToken = async (req, res, next) => {

      const authHeader = req.headers?.authorization;
      if (!authHeader) {

        return res.status(401).send({ message: 'Unauthorized Access' })

      }

      const token = authHeader.split(' ')[1]
      if (!token) {
        return res.status(401).send({ message: 'Unauthorized Access.' })

      }

      const query = { token: token }
      const session = await sessionCollection.findOne(query)
      if (!session) {
        return res.status(401).json({ message: 'Session not found or expired.' });
      }

      const userId = session.userId

      const userQuery = {
        _id: userId
      }
      const user = await userCollection.findOne(userQuery)


      // set data in the req object

      req.userId = session.userId
      req.user = user
      next()

    }
    // must be used after verifying token middleware
    const verifySeeker = async (req, res, next) => {
      if (req.user?.role !== 'seeker') {
        return res.status(403).send({ message: "Forbidden Access." })

      }
      next()
    }

    // must be used after verifying token middleware
    const verifyAdmin = async (req, res, next) => {

      if (req.user?.role !== 'admin') {
        return res.status(403).send({ message: 'Forbidded Access.' })
      }
      next()
    }


    // must be used after verifying token middlewarere

    const verifyRecruiter = async (req, res, next) => {

      if (req.user?.role !== 'recruiter') {
        return res.status(403).send({ message: 'Forbidded Access.' })

      }
      next()
    }

    // JOB RELATED APIS

    app.get('/api/users', async (req, res) => {
      const cursor = userCollection.find().skip(3)
      const result = await cursor.toArray()
      res.send(result)
    })



    // GET API for getting the company individual company jobs

    app.get('/api/jobs', async (req, res) => {
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

    // get single job details page id
    app.get('/api/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id)

      }
      const result = await jobCollection.findOne(query)
      res.send(result)
    })



    // POST
    app.post('/api/jobs', async (req, res) => {
      const job = req.body
      const newJob = {
        ...job,
        createdAt: new Date()
      }
      const result = await jobCollection.insertOne(newJob)
      res.send(result)

    })


    // APPLICATIO RELATED APIS

    // POST
    app.post('/api/applications', async (req, res) => {
      const application = req.body;
      const newApplication = {
        ...application,
        createdAt: new Date()

      }
      const result = await applicationCollection.insertOne(newApplication)
      res.send(result)
    })

    // GET
    app.get('/api/applications', logger, verifyToken, verifySeeker, async (req, res) => {
      const query = {}
      if (req.query.applicationId) {
        query.applicationId = req.query.applicationId

        // check whether asking for user information of someone else 
        if (req.user._id.toString() !== req.query.applicantId) {
          return res.status(403).send({ message: 'forbidden Access.' })

        }

      }
      if (req.query.jobId) {
        query.jobId = req.query.jobId

      }
      if (req.query.applicantId) query.applicantId = req.query.applicantId // ← missing

      const cursor = applicationCollection.find(query)
      const result = await cursor.toArray()
      res.send(result)
    })


    // COMPANY RELATED APIS
    // Post 
    app.post('/api/companies', async (req, res) => {
      const company = req.body
      const newCompany = {
        ...company,
        createdAt: new Date()
      }
      const result = await companyCollection.insertOne(newCompany)
      res.send(result)

    })

    // Get the company

    app.get('/api/my/companies', async (req, res) => {
      const { recruiterId } = req.query

      if (!recruiterId) {
        return res.status(400).json({
          message: 'recruiterId is required'
        });
      }
      const result = await companyCollection.findOne({ recruiterId })
      res.send(result || {})


    })

    // get all companies
    // app.get('/api/companies', async (req, res) => {
    //   const cursor = companyCollection.find()
    //   const result = await cursor.toArray()
    //   res.send(result)
    // })



    // bad system to get to add the job count in  the comapny 
    app.get('/api/companies',
      verifyToken,verifyAdmin, async (req, res) => {

        const cursor = companyCollection.find()



        const companies = await cursor.toArray()
        for (const company of companies) {

          const filter = {
            companyId: company._id.toString()
          }


          const jobCount = await jobCollection.countDocuments(filter)
          company.jobCount = jobCount

        }

        res.send(companies)
      })

    app.put('/api/companies/:id', async (req, res) => {
      const { id } = req.params
      const payload = req.body
      const result = await companyCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: payload }
      )
      res.send(result)
    })



    // Update the company

    app.patch('/api/companies/:id', logger, verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const updatedCompany = req.body;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          status: updatedCompany.status
        }
      }
      const result = await companyCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })


    // plans related apis

    app.get('/api/plans', async (req, res) => {
      const query = {}
      if (req.query.plan_id) {
        query.id = req.query.plan_id

      }
      const plan = await planCollection.findOne(query)
      res.send(plan)
    })

    // subscriptons
    app.post('/api/subscriptions', async (req, res) => {
      const data = req.body;
      const subsInfo = {
        ...data,
        createdAt: new Date()
      }
      const result = await subscriptionCollection.insertOne(subsInfo)

      // update the user plan informaton 

      const filter = { email: data.email }

      const updateDocument = {
        $set: {
          plan: data.planId,
        }
      }

      const updateResult = await userCollection.updateOne(filter, updateDocument)


      res.send(updateResult)




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