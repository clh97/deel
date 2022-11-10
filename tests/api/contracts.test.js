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
