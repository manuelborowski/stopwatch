// Note, the QR scanner must be in french

export const qr_decode = code => {
    const in_caps_template = "ABCDEFGHUIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwyz&é\"'(§è!çàà812345=7+90°6<>?./_,;:-[)£ù^}#{-".split("");
    const in_nocaps_template = "abcdefghuijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWYZ12345678900!&é\"'(+è=çà)§<>,;:-?./_[)µ%^}#{-".split("");
    const out_template = "abcdefghuijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWYZ1234567890°_&é\"'(§è!çà)-<>,;:=?./+[]*%|@#{}".split("");
    // const in_caps_template =    "ABCDEFGHUIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwyzà&é\"'(§è!ç68<>!:?./_,;-12345=7+90°^}#{[{{-[)ù£".split("");
    // const in_nocaps_template =  "abcdefghuijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWYZ0123456789§!<>!/,;:-?._&é\"'(+è=çà)^}#{[{{-[)%µ".split("");
    // const out_template =        "abcdefghuijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWYZ0123456789-_<>\\/,;:=?.+&é\"'(§è!çà)|@#{[^{}[]%*".split("");
    const exclude_template = "!&é\"'(èçà§".split("");
    let out_caps = "";
    let out_nocaps = "";
    for (const c_in of code.split("")) {
        if (in_caps_template.indexOf(c_in) > -1) {
            const co_out = out_template[in_caps_template.indexOf(c_in)];
            if (exclude_template.indexOf(co_out) === -1) out_caps += co_out;
        }
        if (in_nocaps_template.indexOf(c_in) > -1) {
            const co_out = out_template[in_nocaps_template.indexOf(c_in)];
            if (exclude_template.indexOf(co_out) === -1) out_nocaps += co_out;
        }
    }
    return out_caps.length > out_nocaps.length ? out_caps : out_nocaps
}