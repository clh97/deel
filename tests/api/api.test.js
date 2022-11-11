// const supertest = require('supertest');
// const app = require('../../src/server');
// const sequelize = require('../../src/model').sequelize;

import supertest from 'supertest';

import app from '../../src/app';
import { sequelize } from '../../src/model';

beforeEach(async () => {
  const { Profile, Contract, Job } = sequelize.models;
  await Profile.sync({ force: true });
  await Contract.sync({ force: true });
  await Job.sync({ force: true });

  await Profile.create({
    id: 1,
    firstName: 'John',
    lastName: 'Lenon',
    profession: 'Musician',
    balance: 64,
    type: 'contractor',
  });
  await Profile.create({
    id: 2,
    firstName: 'Harry',
    lastName: 'Potter',
    profession: 'Wizard',
    balance: 64,
    type: 'contractor',
  });
});

test('should return the contract only if it belongs to the profile calling', async () => {
  const { Contract } = sequelize.models;

  await Contract.create({
    id: 1,
    ContractorId: 1,
    title: 'Contract 1',
    terms: '',
  });

  const err_response = await supertest(app)
    .get('/contracts/1')
    .set('profile_id', '2');

  const success_response = await supertest(app)
    .get('/contracts/1')
    .set('profile_id', '1');

  expect(err_response.status).toBe(404);
  expect(success_response.status).toBe(200);
});

test('should return a list of contracts belonging to a user', async () => {
  const { Contract } = sequelize.models;

  await Contract.create({
    id: 2,
    ContractorId: 2,
    title: 'Contract 2',
    terms: '',
    status: 'in_progress',
  });

  const err_response = await supertest(app)
    .get('/contracts')
    .set('profile_id', '1');

  const success_response = await supertest(app)
    .get('/contracts')
    .set('profile_id', '2');

  expect(err_response.status).toBe(404);
  expect(success_response.status).toBe(200);
  expect(success_response.body.length).toBe(1);
});

test('should return all unpaid jobs for a user', async () => {
  const { Contract, Job } = sequelize.models;

  await Contract.create({
    id: 2,
    ContractorId: 2,
    title: 'Contract 2',
    terms: '',
    status: 'in_progress',
  });
  await Job.create({
    description: 'work',
    price: 121,
    paid: false,
    paymentDate: '2020-08-14T23:11:26.737Z',
    ContractId: 2,
  });
  await Job.create({
    description: 'work',
    price: 121,
    paid: true,
    paymentDate: '2020-08-14T23:11:26.737Z',
    ContractId: 2,
  });

  const err_response = await supertest(app)
    .get('/jobs/unpaid')
    .set('profile_id', '1');

  const success_response = await supertest(app)
    .get('/jobs/unpaid')
    .set('profile_id', '2');

  expect(err_response.status).toBe(404);
  expect(success_response.status).toBe(200);
  expect(success_response.body.length).toBe(1);
});

test('should pay for a job', async () => {
  const { Profile, Contract, Job } = sequelize.models;

  const client = await Profile.create({
    id: 3,
    firstName: 'John',
    lastName: 'Lenon',
    profession: 'Musician',
    balance: 100,
    type: 'client',
  });
  const contract = await Contract.create({
    id: 2,
    ContractorId: 2,
    ClientId: 3,
    title: 'Contract 3',
    terms: '',
    status: 'in_progress',
  });
  const job = await Job.create({
    id: 1,
    description: 'work',
    price: 50,
    paid: false,
    paymentDate: '2020-08-14T23:11:26.737Z',
    ContractId: 2,
  });
  const contractor = await Profile.findByPk(2);

  expect(client.balance).toBe(100);
  expect(contractor.balance).toBe(64);
  expect(job.paid).toBeFalsy();

  // success case - valid client, valid client balance, valid job
  const success_response = await supertest(app)
    .post('/jobs/1/pay')
    .set('profile_id', '3');

  await client.reload();
  await contractor.reload();
  await job.reload();

  expect(success_response.status).toBe(200);
  expect(client.balance).toBe(50);
  expect(contractor.balance).toBe(64 + 50);
  expect(job.paid).toBeTruthy();
});

test('should deposit money into the the the balance of a client', async () => {
  const { Profile, Contract, Job } = sequelize.models;

  const client = await Profile.create({
    id: 3,
    firstName: 'John',
    lastName: 'Lenon',
    profession: 'Musician',
    balance: 100,
    type: 'client',
  });
  const contract = await Contract.create({
    id: 2,
    ContractorId: 2,
    ClientId: 3,
    title: 'Contract 3',
    terms: '',
    status: 'in_progress',
  });

  expect(client.balance).toBe(100);

  const success_response = await supertest(app)
    .post('/balances/deposit/3')
    .set('profile_id', '3')
    .send({ amount: 50 });

  await client.reload();

  expect(success_response.status).toBe(200);
  expect(client.balance).toBe(150);

  const job = await Job.create({
    id: 1,
    description: 'work',
    price: 500,
    paid: false,
    paymentDate: '2020-08-14T23:11:26.737Z',
    ContractId: 2,
  });

  const error_response = await supertest(app)
    .post('/balances/deposit/3')
    .set('profile_id', '3')
    .send({ amount: 200 });

  await client.reload();

  expect(error_response.status).toBe(403);
  expect(client.balance).toBe(150);
});

test('should return the profession that earned the most money', async () => {
  const { Profile, Contract, Job } = sequelize.models;

  const client = await Profile.create({
    id: 3,
    firstName: 'John',
    lastName: 'Lenon',
    profession: 'Musician',
    balance: 100,
    type: 'client',
  });
  const contract = await Contract.create({
    id: 2,
    ContractorId: 1,
    ClientId: 3,
    title: 'Contract 3',
    terms: '',
    status: 'in_progress',
  });
  const contract2 = await Contract.create({
    id: 3,
    ContractorId: 2,
    ClientId: 3,
    title: 'Contract 3',
    terms: '',
    status: 'in_progress',
  });
  const job = await Job.create({
    id: 1,
    description: 'work1',
    price: 50,
    paid: true,
    paymentDate: '2020-01-01T23:11:26.737Z',
    ContractId: 2,
  });
  const job2 = await Job.create({
    id: 2,
    description: 'work2',
    price: 51,
    paid: true,
    paymentDate: '2021-01-01T23:11:26.737Z',
    ContractId: 3,
  });

  const success_response = await supertest(app)
    .get('/admin/best-profession?start=01-01-2020&end=01-02-2020')
    .set('profile_id', '3')
    .send();

  const success_response2 = await supertest(app)
    .get('/admin/best-profession?start=01-01-2021&end=01-02-2021')
    .set('profile_id', '3')
    .send();

  expect(success_response.status).toBe(200);
  expect(success_response.body.bestProfession.profession).toBe('Musician');
  expect(success_response.body.bestProfession.totalEarned).toBe(50);

  expect(success_response2.status).toBe(200);
  expect(success_response2.body.bestProfession.profession).toBe('Wizard');
  expect(success_response2.body.bestProfession.totalEarned).toBe(51);
});

test('should return the best paying clients', async () => {
  const { Profile, Contract, Job } = sequelize.models;

  const client = await Profile.create({
    id: 3,
    firstName: 'John',
    lastName: 'Lenon',
    profession: 'Musician',
    balance: 100,
    type: 'client',
  });
  const client2 = await Profile.create({
    id: 4,
    firstName: 'Joao',
    lastName: 'Carlos',
    profession: 'Carpenter',
    balance: 500,
    type: 'client',
  });
  const contract = await Contract.create({
    id: 2,
    ContractorId: 1,
    ClientId: 3,
    title: 'Contract 3',
    terms: '',
    status: 'in_progress',
  });
  const contract2 = await Contract.create({
    id: 3,
    ContractorId: 1,
    ClientId: 4,
    title: 'Contract 3',
    terms: '',
    status: 'in_progress',
  });
  const job = await Job.create({
    id: 1,
    description: 'work1',
    price: 500,
    paid: true,
    paymentDate: '2020-01-01T23:11:26.737Z',
    ContractId: 2,
  });
  const job2 = await Job.create({
    id: 2,
    description: 'work2',
    price: 501,
    paid: true,
    paymentDate: '2021-01-01T23:11:26.737Z',
    ContractId: 3,
  });

  const success_response = await supertest(app)
    .get('/admin/best-clients?start=01-01-2020&end=01-01-2021&limit=1')
    .set('profile_id', '3')
    .send();

  const success_response2 = await supertest(app)
    .get('/admin/best-clients?start=01-01-2021&end=01-01-2022&limit=1')
    .set('profile_id', '3')
    .send();

  expect(success_response.status).toBe(200);
  expect(success_response.body.bestClients[0].fullName).toBe('John Lenon');
  expect(success_response.body.bestClients[0].paid).toBe(500);

  expect(success_response2.status).toBe(200);
  expect(success_response2.body.bestClients[0].fullName).toBe('Joao Carlos');
  expect(success_response2.body.bestClients[0].paid).toBe(501);
});
