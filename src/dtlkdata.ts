function ldArg(arg: string | number | undefined): string {
    return arg ? '/' + arg : '';
}

function nNums(n: any): string {
    return n.toString().replace('-', 'n');
}

export async function getDocument(query: {
    [name: string]: string | number;
}): Promise<any> {
    const url = `https://arturo-mayorga.github.io/irl_stats/dist/data/${
        query.namespace + '/'
    }${query.type}${ldArg(query.league)}${ldArg(query.season)}${ldArg(
        query.subsession
    )}${nNums(ldArg(query.simsession))}${ldArg(query.driver)}${ldArg(
        query.car
    )}${ldArg(query.track)}${ldArg(query.sessionType)}${ldArg(
        query.custId
    )}.json`;

    console.log(`:: fetch: ${url}`);

    try {
        let objs = await fetch(url);
        let obj = await objs.json();
        return obj;
    } catch (e) {
        return null;
    }
}
