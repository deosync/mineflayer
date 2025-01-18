const { Vec3 } = require('vec3')
const { createDoneTask, createTask } = require('../promise_utils')

module.exports = inject

function inject (bot) {
  let bobberId = 90
  // Before 1.14 the bobber entity keep changing name at each version (but the id stays 90)
  // 1.14 changes the id, but hopefully we can stick with the name: fishing_bobber
  // the alternative would be to rename it in all version of mcData
  if (bot.supportFeature('fishingBobberCorrectlyNamed')) {
    bobberId = bot.registry.entitiesByName.fishing_bobber.id
  }
  bot.fishingTask = createDoneTask()
  bot.lastBobber = null

  bot._client.on('spawn_entity', (packet) => {
    if (packet.type === bobberId && !bot.fishingTask.done && !bot.lastBobber) {
      let tmp = new Vec3(packet.x, packet.y, packet.z);
      if (tmp.xzDistanceTo(bot.entity.position) < 0.3000000061381125) {
        bot.lastBobber = bot.entities[packet.entityId]
      }else{return}
    }
  })

  bot._client.on('world_particles', (packet) => {
    if (!bot.lastBobber || bot.fishingTask.done) return

    const pos = bot.lastBobber.position
    const parts = bot.registry.particlesByName
    //if(packet.particleId === (parts?.fishing ?? parts.bubble).id && packet.particles === 6) console.log(pos.distanceTo(new Vec3(packet.x, pos.y, packet.z)))
    if (packet.particleId === (parts?.fishing ?? parts.bubble).id && packet.particles === 6 && pos.distanceTo(new Vec3(packet.x, pos.y, packet.z)) <= 0.02) {
      bot.activateItem()
      bot.lastBobber = undefined
      bot.fishingTask.finish()
    }
  })
  bot._client.on('entity_destroy', (packet) => {
    if (!bot.lastBobber) return
    if (packet.entityIds.some(id => id === bot.lastBobber.id)) {
      bot.lastBobber = undefined
      bot.fishingTask.cancel(new Error('Fishing cancelled due lastBobber has destroyer'))
    }
  })
  bot.on('changeDimension', (state) => {
    if (bot.lastBobber) {
      bot.lastBobber = undefined
    }
    if (!bot.fishingTask.done) {
      bot.fishingTask.cancel(new Error('Fishing cancelled due dimension change'))
    }
  })
  async function fish () {
    if (!bot.fishingTask.done) {
      bot.fishingTask.cancel(new Error('Fishing cancelled due to calling bot.fish() again'))
    }

    bot.fishingTask = createTask()
    bot.activateItem()

    await bot.fishingTask.promise
  }
  bot.fish = fish
}
