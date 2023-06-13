const axios = require('axios');
const Error503 = require('../../errors/Error503');
const redisClient = require('../../services/clientRedis');

/**
 * Object containing the functions for retrieving country data from the RestCountries API.
 */
const countryApi = {
  /**
   * Retrieves data for a country using the ISO code.
   * @param {string} isoCode - ISO country code (e.g. FRA)
   * @returns {Promise<Object|null>} - Country data or null in case of error.
   */
  fetchCountryData: async (isoCode) => {
    console.log('entre dans le datamapper');
    const redisClient = redis.createClient(process.env.REDISPORT, process.env.REDISHOST, { auth_pass: process.env.REDISPASSWORD });
    const cacheKey = `restCountry:${isoCode}`;

    const cacheValue = await redisClient.get(cacheKey);

    if (cacheValue) {
      await redisClient.quit();
      return JSON.parse(cacheValue);
    }

    console.log('je passe la connexion redis');

    const baseUrl = 'https://restcountries.com/v3.1/';

    const param = {
      service: 'alpha',
      value: isoCode,
      fields: [
        'name',
        'currencies',
        'capital',
        'subregion',
        'region',
        'languages',
        'flags',
        'coatOfArms',
        'area',
        'maps',
        'population',
        'car',
        'timezone',
        'continent',
      ],
    };

    const url = `${baseUrl}/${param.service}/${param.value}?fields=${param.fields}`;

    console.log('Construction url OK');

    try {
      console.log('je rentre dans le try/catch');
      const response = await axios.get(url);
      console.log('requete OK', response.data);

      // Caching with Redis
      await redisClient.set(cacheKey, JSON.stringify(response.data));
      redisClient.expire(cacheKey, process.env.REDIS_TTL);
      await redisClient.quit();

      console.log('je quitte redis');

      return response.data;
    } catch (error) {
      if (error.response.status === 503) {
        throw new Error503({ HttpCode: 503, Status: 'Fail', Message: 'Service Unavailable' });
      } else {
        return error;
      }
    }
  },

  /**
   * Retrieves data from all countries.
   * @returns {Promise<Object|null>} - Data for all countries or null in the event of an error.
   */
  fetchAllCountries: async () => {
    await redisClient.connect();
    const cacheKey = 'restCountry';

    const cacheValue = await redisClient.get(cacheKey);

    if (cacheValue) {
      await redisClient.quit();
      return JSON.parse(cacheValue);
    }

    const baseUrl = 'https://restcountries.com/v3.1/';

    const param = {
      service: 'all',
      fields: ['flags', 'cca3'],
    };

    const url = `${baseUrl}/${param.service}?fields=${param.fields}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error503({ HttpCode: 503, Status: 'Fail', Message: 'Service Unavailable' });
      }
      const data = await response.json();

      await redisClient.set(cacheKey, JSON.stringify(data));
      redisClient.expire(cacheKey, process.env.REDIS_TTL);
      await redisClient.quit();

      return data;
    } catch (error) {
      return null;
    }
  },
};

module.exports = countryApi;
