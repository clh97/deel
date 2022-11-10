// const supertest = require('supertest');
// const app = require('../../src/server');
// const sequelize = require('../../src/model').sequelize;

import supertest from 'supertest';

import app from '../../src/app';
import { sequelize } from '../../src/model';

beforeAll(async () => {
  const { Profile, Contract, Job } = sequelize.models;
  await Profile.sync({ force: true });
  await Contract.sync({ force: true });
  await Job.sync({ force: true });
});

test('should return the contract only if it belongs to the profile calling', async () => {
  const { Profile, Contract } = sequelize.models;

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
    firstName: 'John',
    lastName: 'Lenon',
    profession: 'Musician',
    balance: 64,
    type: 'contractor',
  });
  await Contract.create({
    id: 1,
    ContractorId: 1,
    title: 'Contract 1',
    terms: '',
  });

  const response = await supertest(app)
    .get('/contracts/1')
    .set('profile_id', '2');

  expect(response.status).toBe(404);
});
