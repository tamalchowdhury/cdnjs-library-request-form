/**
 * Transform a set of author strings/objects into consistent author objects
 *
 * @param {Array<String|Object>} authors The unclean authors
 * @return {{name: *, email: *, url: *}[]} The cleaned, consistent authors
 */
const transformAuthors = (authors) =>
  authors
    .filter((x) => !!x)
    .map((author) => {
      // Get the name, email & url
      let name = typeof author === "string" ? author : author.name
      const email =
        author.email ||
        name
          .match(/^.*?((?: <.+>)?)(?: \(.+\))?$/)[1]
          .slice(2)
          .slice(0, -1)
      const url =
        author.url ||
        author.homepage ||
        name
          .match(/^.*?((?: \(.+\))?)(?: <.+>)?$/)[1]
          .slice(2)
          .slice(0, -1)
      name = name.match(/^(.*?)(?:(?: \(.+\))|(?: <.+>)){0,2}$/)[1]

      // Create the obj and clean
      const data = {
        name,
        email,
        url,
      }
      for (let key in data) {
        if (!data[key]) {
          delete data[key]
        }
      }
      return data
    })

/**
 * Generate the full cdnjsData for an NPM package
 *
 * @param {Object} cdnjsData The initial, bare-bones cdnjsData {name: "bootstrap"}
 * @returns {Promise<Object>|Promise<void>} The fully-fledged cdnjsData for the NPM package
 */
const npm = async (cdnjsData) => {
  // Get the NPM package name to use
  const npmName = cdnjsData.name

  // Get the package from NPM
  const rawData = await fetch(`https://registry.npmjs.com/${npmName}`)
  const jsonData = await rawData.json()

  // Error if NPM errored
  if (jsonData.error) {
    console.error(chalk.red(jsonData.error))
    return
  }

  // Get the latest version from NPM
  const jsonVersionData = jsonData.versions[jsonData["dist-tags"].latest]

  // Ack
  console.log(`Located ${jsonData.name}@${jsonData["dist-tags"].latest}...`)

  // Merge in the version
  const jsonFullData = {
    ...jsonVersionData,
    ...jsonData,
  }

  // Store basic info
  cdnjsData.description = jsonFullData.description || ""
  cdnjsData.keywords = jsonFullData.keywords || []
  cdnjsData.license = jsonFullData.license || ""
  cdnjsData.homepage = jsonFullData.homepage || ""
  cdnjsData.repository = jsonFullData.repository || {}

  // Authors magic
  cdnjsData.authors = transformAuthors([
    jsonFullData.author,
    ...(jsonFullData.authors || []),
  ])

  // removed the download tarball for now

  return cdnjsData
}

document.querySelector(".form").addEventListener("submit", handleSubmit)

async function handleSubmit(event) {
  event.preventDefault()

  let name = event.target.name.value
  let license = event.target.license.value
  let source = event.target.source.value
  let fileNames = event.target.fileNames.value

  if (!name) return

  let cdnjsData = await npm({ name })

  console.log("Requested data is ", cdnjsData)
  const prettyData = js_beautify(JSON.stringify(cdnjsData), { indent_size: 2 })
  document.querySelector(".output").textContent = prettyData
}
