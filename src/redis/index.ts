
import redis from 'redis';

const client = redis.createClient();


client.connect().then(() => {
    console.log("redis connected");
})

export default { client };
