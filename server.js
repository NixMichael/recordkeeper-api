const express = require('express')
const knex = require('knex')
const cors = require('cors')

const db = knex({
    client: 'pg',
    connection: {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorised: false
        }
    }
})

const app = express()

app.use(express.json())
app.use(cors())

// Unnecessary
app.get('/', (req, res) => {
  res.send('It be working')
})
// ***********

app.post('/newuser', async (req,res) => {
    const { usertype, initials, name } = req.body

    await db('users')
    .insert({
        initials: initials,
        name: name,
        usertype: usertype
    })

    const newList = await db('users').returning('*').select('*').orderBy('name', 'asc')

    res.status(200).send(newList)

      // .then((newList) => {
      //     res.status(200).json(newList)
      // })
  // .catch(err => console.log('Error', err))
})

app.post('/newreferrer', async (req,res) => {
    const { initials, name } = req.body

    await db('referrer')
          .insert({
              initials: initials,
              name: name
          })
    
    const newList = await db('referrer').returning('*').select('*').orderBy('name', 'asc')

    res.status(200).send(newList)

    // .catch(err => console.log('Error', err))
})

app.post('/newdepartment', async (req,res) => {
    const { department } = req.body

    await db('departments')
      .insert({
        name: department,
//        headofdepartment: ''
      })

    const newList = await db('departments').select('*').returning('*').orderBy('name', 'asc')

    res.status(200).send(newList)

    // .catch(err => console.log('Error', err))
})

app.post('/newcategory', async (req,res) => {
  const { category, cost } = req.body

  await db('categories')
    .insert({
        name: category,
        techtypecost: cost
    })
  
  const newList = await db('categories').select('*').returning('*').orderBy('name', 'asc')

  res.status(200).send(newList)

  // .catch(err => console.log('Error', err))
})

app.post('/', async (req, res) => {
    const { seqNum, day, job, permission, requestedBy, department, hospitalNumber, patientSurname, patientForename, description, user, issues, type, category } = req.body

    let countTotal;

    await db('index')
      .insert({
          jobnumber: job,
          requestedby: requestedBy,
          type: type,
          sequencenumber: seqNum,
          day: day,
          department: department
      })

    const total = await db('index').count('id')
    countTotal = total[0].count

    if (type === 'p') {
      await db('patientjobs')
        .returning('*')
        .insert({
            jobnumber: job,
            permission: permission,
            hospitalnumber: hospitalNumber,
            patientsurname: patientSurname,
            patientforename: patientForename,
            description: description,
            photographer: user
        })
    } else if (type === 't') {
      await db('techjobs')
        .returning('*')
        .insert({
            jobnumber: job,
            category: category,
            description: description,
            quantity: 1,
            designer: user
        })
      }
    res.send(countTotal)
    if (issues.length > 0) {
        db('issued')
        .insert({
            jobnumber: job,
            type: issues[0],
            date: issues[1],
            notes: issues[2],
            qty: issues[3],
            cost: issues[4]
            
        }).catch(console.log)
    }
})

app.post('/addissued', async (req,res) => {
    const { jobnumber, type, date, notes, qty, cost } = req.body

    await db('issued')
    .insert({
        jobnumber: jobnumber,
        type: type,
        date: date,
        notes: notes,
        qty: qty,
        cost: cost
    })

    await db('index').where('jobnumber', jobnumber).update({
      issued: true
    })

    const updatedIssues = await db('issued').returning('*').select('*').where('jobnumber', jobnumber).orderBy('id', 'asc')
    res.status(200).send(updatedIssues)
})

app.delete('/deleteissued', async (req, res) => {

  const {id, jobnumber} = req.body

  await db('issued').where('id', id).del()
  const updatedIssues = await db('issued').returning('*').select('*').where('jobnumber', jobnumber).orderBy('id', 'asc')

  if (updatedIssues.length === 0) {
    await db('index').where('jobnumber', jobnumber).update({
      issued: false
    })
  }
  res.status(200).send(updatedIssues)
})

app.delete('/deletenewissues', async (req, res) => {
  const { jobnumber, count } = req.body

  const result = await db('issued').select('*').where('jobnumber', jobnumber).orderBy('id', 'desc').limit(count)

  result.map(async (issue) => {
    const id = issue.id
    await db('issued').select('*').where('id', id).del()
  })
})

app.put('/editrecord', async (req, res) => {

    const { job, permission, requestedBy, hospitalNumber, patientSurname, patientForename, description, photographer, department, type, category, designer} = req.body

    await db('index').where('jobnumber', job)
      .update({
        requestedby: requestedBy,
        department: department
      })

    if (type === 'p') {
        await db('patientjobs').where('jobnumber', job)
          .update({
              permission: permission,
              hospitalnumber: hospitalNumber,
              patientsurname: patientSurname,
              patientforename: patientForename,
              description: description,
              photographer: photographer
          })
    } else if (type === 't') {
                await db('techjobs').where('jobnumber', job)
                  .update({
                    category: category,
                    description: description,
                    designer: designer
                  })
                // .then(() => res.status(200).json('Success'))
                // .catch(err => console.log('Error', err))
    }
})

app.delete('/deleterecord', async (req, res) => {
    const {job,recordType} = req.body

    await db('index').where('jobnumber', job).del()
    await db('issued').where('jobnumber', job).del()

    if (recordType === 'p') {
      const deleted = await db('patientjobs').select('*').where('jobnumber', job).del()
      res.status(200).send(`Deleted: ${deleted}`)
    } else if (recordType === 't') {
      const deleted = await db('techjobs').select('*').where('jobnumber', job).del()
      res.status(200).send(`Deleted: ${deleted}`)
      // .catch(err => console.log(`Erroneous: ${err}`))
    }
})

app.delete('/deleteuser', async (req,res) => {
  const { toDelete } = req.body

  for (c = 0; c < toDelete.length; c++) {
    await db('users').select('*').where('name', toDelete[c]).del()
  }
  const updatedList = await db('users').select('*').orderBy('name', 'asc')
  res.send(updatedList)
})

app.delete('/deletereferrer', async (req,res) => {
  const { toDelete } = req.body

  for (c = 0; c < toDelete.length; c++) {
    await db('referrer').select('*').where('name', toDelete[c]).del()
  }

  const updatedList = await db('referrer').select('*').orderBy('name', 'asc')
  res.send(updatedList)
})

app.delete('/deletedepartment', async (req,res) => {
  const { toDelete } = req.body

  for (c = 0; c < toDelete.length; c++) {
    await db('departments').select('*').where('name', toDelete[c]).del()
  }

  const updatedList = await db('departments').select('*').orderBy('name', 'asc')
  res.send(updatedList)
})

app.delete('/deletecategory', async (req, res) => {
  const { toDelete } = req.body

  for (c = 0; c < toDelete.length; c++) {
    await db('categories').where('name', toDelete[c]).select('*').del()
  }

  const updatedList = await db('categories').select('*').orderBy('name', 'asc')
  res.send(updatedList)
})

app.delete('/deletereport', async (req, res) => {
  const { toDelete } = req.body

  for (c = 0; c < toDelete.length; c++) {
    await db('reports').where('name', toDelete[c]).select('*').del()
  }

  const updatedList = await db('reports').select('*').orderBy('name', 'asc')
  res.send(updatedList)
})

app.get('/gettechcost/:cat', async (req, res) => {
  const { cat } = req.params

  const result = await db('categories').select('techtypecost').where('name', cat)
  const techTypeCost = result[0].techtypecost
  res.send(techTypeCost)
})

// FUNCTION TO FETCH A RECORD. CALLED FROM ALL RECORD FETCH ROUTES
const getRecord = async (order, id, res) => {

  let data = []

  const count = await db('index').count('id')
  data[5] = count[0].count

  let jobNum

  const recId = id <1 ? 1 : data[5]

  const index = await db('index').orderBy('id', order).select('*').limit(recId)
  data[0] = index[id].type
  data[3] = index[id].department
  data[4] = index[id].requestedby
  data[6] = index[id].sequencenumber
  data[7] = index[id].day
  jobNum = index[id].jobnumber

  if (index[id].type === 'p') {
    const patientjob = await db('patientjobs').where('jobnumber', jobNum).select('*')
    data[1] = patientjob[0]
  } else if (index[id].type === 't') {
    const techjob = await db('techjobs').where('jobnumber', jobNum).select('*')
    data[1] = techjob[0]
  }

  const issued = await db('issued').where('jobnumber', jobNum).orderBy('id', 'asc').select('*')
  data[2] = issued

  res.send(data)
}

// FETCH RECORD ROUTES
app.get('/firstrec/:id', (req, res) => {
  const { id } = req.params
  getRecord('asc', id, res)
})

app.get('/lastrec/:id', (req, res) => {
  const { id } = req.params
  getRecord('desc', id, res)
})

app.get('/nextrec/:id', (req, res) => {
  const {id} = req.params
  getRecord('asc', id, res)
})

// SEARCH BY JOB NUMBER
app.get('/search/:value', async (req, res) => {
    const {value} = req.params

    let searchRes = []

    const index = await db('index').select('*')
    .where('jobnumber', value)
    searchRes[2] = index[0].type
    searchRes[3] = index[0].department
    searchRes[4] = index[0].requestedby

    const indexList = await db('index').select('jobnumber').orderBy('id', 'asc')
    searchRes[5] = indexList

    const issued = await db('issued').select('*').where('jobnumber', value).orderBy('id', 'asc')
    searchRes[0] = issued

    if (searchRes[2] === 'p') {
      const patientRecord = await db('patientjobs').select('*')
      .where('jobnumber', value)
      searchRes[1] = patientRecord[0]
    } else if (searchRes[2] === 't') {
      const techRecord = await db('techjobs').select('*')
      .where('jobnumber', value)
      searchRes[1] = techRecord[0]
    }

    res.send(searchRes)
})

// RETRIEVE ALL LISTS
app.get('/fetchFields', async (req, res) => {
  let dropDownContents = []

  const referrers = await db('referrer').select('*').orderBy('name', 'asc')
  const users = await db('users').select('*').orderBy('name', 'asc')
  const categories = await db('categories').select('*').orderBy('name', 'asc')
  const departments = await db('departments').select('*').orderBy('name', 'asc')
  const reports = await db('reports').select('*').orderBy('name', 'asc')

  dropDownContents = [referrers, users, categories, departments, reports]

  res.send(dropDownContents)
})

app.get('/getRecord', async (req, res) => {
    let dropDownContents = [];

    const previousJob = await db('index').select('*').orderBy('id', 'desc').limit(1)

    if (previousJob[0] !== undefined) {
        dropDownContents[4] = [
          previousJob[0].type, 
          previousJob[0].sequencenumber, 
          previousJob[0].day, 
          previousJob[0].department, 
          previousJob[0].jobnumber
        ]
    }

    const count = await db('index').count('id')
    dropDownContents[3] = count[0]

    const refs = await db('referrer').select('*').orderBy('name', 'asc')
    dropDownContents[0] = refs
    
    const users = await db('users').select('*').orderBy('name', 'asc')
    dropDownContents[1] = users

    const categories = await db('categories').select('*')
    dropDownContents[7] = categories

    const departments = await db('departments').select('*')
    dropDownContents[8] = departments
    
    const patientjobs = await db('patientjobs').select('*').orderBy('id', 'desc').limit(1)
    dropDownContents[2] = patientjobs[0]

    const techjobs = await db('techjobs').select('*').orderBy('id', 'desc').limit(1)
    dropDownContents[5] = techjobs[0]

    const issuedList = await db('issued').select('*').where('jobnumber', dropDownContents[4][4]).orderBy('id', 'asc')
    dropDownContents[9] = issuedList

    res.send(dropDownContents)
})

app.post('/searchrecs', async (req, res) => {

  const { type, photographer, permission, hospitalnumber, patientsurname, patientforename, dateFrom, dateTo, designer, category, referrer, description, department, onlyIssued } = req.body

  console.log(req.body)

  let reportData = []

  if (type === 'p') {
    reportData = await db('index')
      .join('patientjobs', 'index.jobnumber', '=', 'patientjobs.jobnumber')
      .select(db.raw('TO_CHAR("creationdate", \'DD-MM-YYYY\')'), 'index.id', 'index.jobnumber', 'index.department', 'index.requestedby', 'index.creationdate', 'patientjobs.photographer', 'patientjobs.hospitalnumber', 'patientjobs.patientsurname', 'patientjobs.patientforename', 'patientjobs.permission', 'patientjobs.description', 'index.issued'
      )
      .where('photographer', 'like', `%${photographer}%`)
      .where('permission', 'like', `%${permission}%`)
      .where('hospitalnumber', 'like', `%${hospitalnumber}%`)
      .where('patientsurname', 'ilike', `%${patientsurname}%`)
      .where('patientforename', 'ilike', `%${patientforename}%`)
      .where('index.requestedby', 'like', `%${referrer}%`)
      .where('description', 'ilike', `%${description}%`)
      .where('department', 'like', `%${department}%`)
      .where('creationdate', '>=', dateFrom)
      .where('creationdate', '<=', dateTo)
      .orderBy('jobnumber', 'asc')
  } else if (type === 't') {
    reportData = await db('index')
      .join('techjobs', 'index.jobnumber', '=', 'techjobs.jobnumber')
      .select(db.raw('TO_CHAR("creationdate", \'DD-MM-YYYY\')'), 'index.id', 'index.jobnumber', 'index.department', 'index.requestedby', 'index.creationdate', 'techjobs.category', 'techjobs.description', 'techjobs.designer', 'index.issued'
      )
      .where('designer', 'like', `%${designer}%`)
      .where('category', 'like', `%${category}%`)
      .where('index.requestedby', 'like', `%${referrer}%`)
      .where('description', 'ilike', `%${description}%`)
      .where('department', 'like', `%${department}%`)
      .where('creationdate', '>=', dateFrom)
      .orderBy('jobnumber', 'asc')
  }

  // Filter out records that haven't been issued if checkbox on search component was checked
  if (onlyIssued) {
    const reportDataIssuedOnly = reportData.filter(result => result.issued !== false)
    console.log(reportDataIssuedOnly)
    res.send(reportDataIssuedOnly)
  } else {
    res.send(reportData)
  }
})

app.post('/reportresults', async (req, res) => {

  const { type, photographer, permission, hospitalnumber, patientsurname, patientforename, dateFrom, dateTo, designer, category, referrer, description, department, onlyIssued } = req.body

  let reportData = []

  if (type === 'p') {
    reportData = await db('index')
      .join('patientjobs', 'index.jobnumber', '=', 'patientjobs.jobnumber')
      .leftJoin('issued', 'index.jobnumber', '=', 'issued.jobnumber') // select all from first join and relevant from issued
      .select(db.raw('TO_CHAR("creationdate", \'DD-MM-YYYY\')'), 'index.jobnumber', 'index.department', 'index.requestedby', 'index.creationdate', 'patientjobs.photographer', 'patientjobs.hospitalnumber', 'patientjobs.patientsurname', 'patientjobs.patientforename', 'patientjobs.permission', 'patientjobs.description', 'issued.id', 'issued.cost'
      )
      .where('photographer', 'like', `%${photographer}%`)
      .where('permission', 'like', `%${permission}%`)
      .where('hospitalnumber', 'like', `%${hospitalnumber}%`)
      .where('patientsurname', 'ilike', `%${patientsurname}%`)
      .where('patientforename', 'ilike', `%${patientforename}%`)
      .where('index.requestedby', 'like', `%${referrer}%`)
      .where('description', 'ilike', `%${description}%`)
      .where('department', 'like', `%${department}%`)
      .where('creationdate', '>=', dateFrom)
      .where('creationdate', '<=', dateTo)
      .orderBy('jobnumber', 'asc')
  } else if (type === 't') {
    reportData = await db('index')
      .join('techjobs', 'index.jobnumber', '=', 'techjobs.jobnumber')
      .leftJoin('issued', 'index.jobnumber', '=', 'issued.jobnumber') // select all from first join and relevant from issued
      .select(db.raw('TO_CHAR("creationdate", \'DD-MM-YYYY\')'), 'index.jobnumber', 'index.department', 'index.requestedby', 'index.creationdate', 'techjobs.category', 'techjobs.description', 'techjobs.designer', 'issued.id', 'issued.cost'
      )
      .where('designer', 'like', `%${designer}%`)
      .where('category', 'like', `%${category}%`)
      .where('index.requestedby', 'like', `%${referrer}%`)
      .where('description', 'ilike', `%${description}%`)
      .where('department', 'like', `%${department}%`)
      .where('creationdate', '>=', dateFrom)
      .where('creationdate', '<=', dateTo)
      .orderBy('jobnumber', 'asc')
  }

  // Filter out records that haven't been issued if checkbox on search component was checked
  if (onlyIssued) {
    const reportDataIssuedOnly = reportData.filter(result => result.issued !== false)
    res.send(reportDataIssuedOnly)
  } else {
    res.send(reportData)
  }
})

app.post('/addreport', async (req, res) => {

  const { permission, hospitalNumber, patientForename, patientSurname, designer, photographer, referrer, department, description, category } = req.body[1]

  await db('reports').insert({
    name: req.body[0],
    permission: permission,
    hospitalnumber: hospitalNumber,
    patientforename: patientForename,
    patientsurname: patientSurname,
    designer: designer,
    photographer: photographer,
    referrer: referrer,
    department: department,
    description: description,
    category: category,
    type: req.body[2]
  })

  res.send('success')
})

app.get('/fetchreports', async (req, res) => {
  const reportList = await db('reports').select('name')
  res.send(reportList)
})

app.post('/fetchreport', async (req, res) => {
  const { reportName } = req.body
  const result = await db('reports').select('*').where('name', reportName)
  res.send(result[0])
})

app.listen(process.env.PORT || 3004, () => {
    console.log(`Listening on port ${process.env.PORT}`)
})