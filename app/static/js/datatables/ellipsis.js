$.fn.dataTable.render.multi = function(renderArray) {
    return function(d, type, row, meta) {
        for(var r = 0; r < renderArray.length; r++) {
            d = renderArray[r](d, type, row, meta);
        }

        return d;
    }
}

export const return_render_ellipsis = ( cutoff, wordbreak, escapeHtml ) => {
	var esc = function ( t ) {
		return t.replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' ).replace( /"/g, '&quot;' );
	};

	return function ( d, type, row ) {
		// Order, search and type get the original data
		if ( type !== 'display' ) return d;
		if ( typeof d !== 'number' && typeof d !== 'string' ) return d;
		d = d.toString(); // cast numbers
		// Protect against uncontrolled HTML input
		if ( escapeHtml ) d = esc( d );
		if ( d.length <= cutoff ) return d;
		let shortened = d.substring(0, cutoff-1);
		// Find the last white space character in the string
		if ( wordbreak ) shortened = shortened.replace(/\s([^\s]*)$/, '');
		return '<span class="ellipsis" title="'+esc(d)+'">'+shortened+'&#8230;</span>';
	};
};