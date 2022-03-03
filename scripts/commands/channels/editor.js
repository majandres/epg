const { api, parser, xml, file, logger } = require('../../core')
const { transliterate } = require('transliteration')
const nodeCleanup = require('node-cleanup')
const { program } = require('commander')
const inquirer = require('inquirer')

program
  .requiredOption('-i, --input <file>', 'Load channels from the file')
  .option('-c, --country <name>', 'Source country', 'us')
  .parse(process.argv)

const options = program.opts()
const defaultCountry = options.country
const newLabel = ` [new]`

let site
let channels = []

async function main() {
  await api.channels.load()
  let result = await parser.parseChannels(options.input)
  site = result.site
  channels = result.channels
  for (const channel of channels) {
    if (channel.xmltv_id) continue
    let choices = await getOptions(channel)
    const question = {
      name: 'option',
      message: `Choose an option:`,
      type: 'list',
      choices,
      pageSize: 10
    }
    await inquirer.prompt(question).then(async selected => {
      switch (selected.option) {
        case 'Overwrite...':
          const input = await getInput(channel)
          channel.xmltv_id = input.xmltv_id
          break
        case 'Skip...':
          break
        default:
          const [name, xmltv_id] = selected.option
            .replace(/ \[.*\]/, '')
            .split('|')
            .map(i => i.trim().replace(newLabel, ''))
          channel.xmltv_id = xmltv_id
          break
      }
    })
  }
}

main()

function save() {
  const output = xml.create(channels, site)

  file.writeSync(options.input, output)

  logger.info(`\nFile '${options.input}' successfully saved`)
}

nodeCleanup(() => {
  save()
})

async function getInput(channel) {
  const name = channel.name.trim()
  const input = await inquirer.prompt([
    {
      name: 'xmltv_id',
      message: '  ID:',
      type: 'input',
      default: generateCode(name, defaultCountry)
    }
  ])

  return { name, xmltv_id: input['xmltv_id'] }
}

async function getOptions(channel) {
  const channels = await api.channels.all()
  const similar = await getSimilar(channels, channel)
  let variants = []
  variants.push(`${channel.name.trim()} | ${generateCode(channel.name, defaultCountry)}${newLabel}`)
  similar.forEach(i => {
    variants.push(`${i.name} | ${i.id} [api]`)
  })
  variants.push(`Overwrite...`)
  variants.push(`Skip...`)

  return variants
}

async function getSimilar(list, channel) {
  return list.filter(i =>
    i.name
      .toLowerCase()
      .replace(/\s|-|:/gi, '')
      .startsWith(
        channel.name
          .replace(/(\s|-|:)/gi, '')
          .slice(0, 8)
          .toLowerCase()
      )
  )
}

function generateCode(name, country) {
  const id = transliterate(name)
    .replace(/\+/gi, 'Plus')
    .replace(/[^a-z\d]+/gi, '')

  return `${id}.${country}`
}
