import { TFile, TFolder } from 'obsidian';
import IcalExpander from 'ical-expander';
import { CTTKCPlugin } from './cttkc-plugin';

export async function handleCalendarData(options: {
	plugin: CTTKCPlugin;
	data: string;
	folder: TFolder;
	tasksPrefix: string;
	startDate: string;
	endDate: string;
}) {
	const icalExpander: IcalExpander = await (new Promise((resolve) => { resolve(new IcalExpander({
		ics: options.data,
		maxIterations: 0
	})); }));
	const { events } = icalExpander.between(new Date(`${options.startDate}T00:00:00.000`), new Date(`${options.endDate}T00:00:00.000`));

	const eventAggData: {
		[key: string]: {
			duration: number;
		}
	} = {};
	events.forEach((event) => {
		if (event?.component?.jCal?.[0] !== 'vevent') {
			return false;
		}
		const propsArray = event?.component?.jCal?.[1];
		if (!Array.isArray(propsArray)) {
			return false;
		}
		const props: {
			start: string;
			end: string;
			summary: string;
		} = {} as typeof props;
		propsArray.forEach((prop) => {
			if (!Array.isArray(prop)) {
				return false;
			}
			if (prop[0] === 'dtstart') {
				props.start = prop[3]
			}
			if (prop[0] === 'dtend') {
				props.end = prop[3]
			}
			if (prop[0] === 'summary') {
				props.summary = prop[3]
			}
		});
		if (!props.summary || !props.start || !props.end) {
			return false;
		}
		const tokens = props.summary.split(/\s+/).filter((t) => t.startsWith(options.tasksPrefix));
		tokens.forEach((t) => {
			eventAggData[t] = eventAggData[t] || {};
			const duration = (new Date(props.end)).getTime() - (new Date(props.start)).getTime();
			eventAggData[t].duration = (eventAggData[t].duration || 0) + duration;
		})
	});
	console.log('agg', JSON.stringify(eventAggData));

	options.folder.children.forEach((note: TFile) => {
		const data = eventAggData[`${options.tasksPrefix}${note.basename}`];
		if (!data || !data.duration) {
			console.log(`No data found for ${note.basename}`);
			return false;
		}
		options.plugin.app.fileManager.processFrontMatter(note as TFile, (frontmatter) => {
			const totalMinutes = Math.floor(data.duration / 60000)
			const hours = Math.floor(totalMinutes / 60);
			const minutes = totalMinutes % 60;
			const hoursStr = hours ? `${hours}h ` : '';
			frontmatter.duration = `${hoursStr}${minutes}m`;
		});
		console.log(`${note.basename} is updated`);
	});
}