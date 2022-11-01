
function ColorLightener(color, percent) {
    let num = parseInt(color,16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt*3,
        B = (num >> 8 & 0x00FF) + amt,
        G = (num & 0x0000FF) + amt*2;

    return (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255)).toString(16).slice(1);
}


function Sleep(milliseconds) {
    let start = new Date().getTime();
    for (let i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds){
            break;
        }
    }
}

function DegToRad(deg){
    return (Math.PI/180) * deg
}

function Round(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100
}

function Distance(a, b) {
    let q = a[0] - b[0]
    let r = a[1] - b[1]
    let s = a[2] - b[2]

    return (Math.abs(q) + Math.abs(r) + Math.abs(s)) / 2
}

function ToKey(c){
    let q = c[0].toString()
    let r = c[1].toString()
    let s = c[2].toString()
    return q+r+s
}

export {
    ColorLightener,
    Sleep,
    DegToRad,
    Round,
    Distance,
    ToKey
}