use("mflix")
db.movies.find({}, { "tomatoes.viewer.rating": 1, _id: 0 })

use("mflix")
db.movies.find({}, { title: 1, "cast": { $slice: 2 }, _id: 0 })

use("mflix")
db.movies.find(
  { cast: "Arnold Schwarzenegger" },
  {
    released: 0,
    tomatoes: 0,
    imdb: 0,
    awards: 0
  }
)
use("mflix")
db.movies.find(
  { runtime: { $lt: 180 } },
  { title: 1, directors: { $slice: 1 }, _id: 0 }
)

use("supplies")
db.sales.find(
  { "items.quantity": { $gt: 5 } },
  { "items": { $slice: 1 } }
)

use("supplies")
db.sales.find(
  {
    "items": {
      $elemMatch: {
        quantity: { $gt: 5 },
        tags: "office"
      }
    }
  },
  {
    saleDate: 1,
    "items": { $slice: 1 },
    _id: 0
  }
)

use("supplies")
db.sales.find(
  {
    "items": {
      $elemMatch: {
        quantity: { $gt: 5 },
        tags: { $all: ["office", "general"] }
      }
    }
  },
  {
    saleDate: 1,
    "items": { $slice: 1 },
    _id: 0
  }
)
