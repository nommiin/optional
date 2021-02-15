Optional = {
    Keyword: "//#!optional:",
    Marker: function( _str, _arg, _type, _count ) {
        if (_arg == undefined) {
            let MarkerParsed = JSON.parse(_str);
            for(var Member in MarkerParsed) {
                this[Member] = MarkerParsed[Member];
            }
        } else {
            this.Name = _str;
            this.Arguments = _arg;
            this.Type = _type;
            this.Count = _count;
        }

        this.Emit = function() {
            return Optional.Keyword + JSON.stringify(this);
        }

        this.EmitFunction = function( _optional ) {
            let FuncBuild = "";
            if (this.Type == "Prefix") {
                FuncBuild += this.Name + " = function( ";
            } else FuncBuild += "function " + this.Name + "( ";

            for(var i = 0; i < this.Arguments.length; i++) {
                let ArgumentGet = this.Arguments[i];
                if (typeof(ArgumentGet) == "object") {
                    FuncBuild += ArgumentGet[0];
                    if (_optional == true) {
                        FuncBuild += "=" + ArgumentGet[1];
                    }
                } else FuncBuild += ArgumentGet;
                if (i < this.Arguments.length - 1) FuncBuild += ", ";
            }
            return FuncBuild + " ) {";
        }
    },
    Initialize: function() {
        // Hook into pre/post processor methods
        let KGmlScript = $hxClasses["file.kind.gml.KGmlScript"].prototype;
        let preproc_Base = KGmlScript.preproc; KGmlScript.preproc = function( editor, code ) {
            let __return__ = preproc_Base.apply(this, [editor, code]);
            __return__ = Optional.Preprocess(editor, __return__);
            return __return__;
        }
        let postproc_Base = KGmlScript.postproc; KGmlScript.postproc = function( editor, code ) {
            let __return__ = postproc_Base.apply(this, [editor, code]);
            __return__ = Optional.Postprocess(editor, __return__);
            return __return__;
        }
    },
    Preprocess: function( editor, code ) {
        let Lines = code.split("\n");
        for(var i = 0; i < Lines.length; i++) {
            let LineGet = Lines[i].trim();
            if (LineGet.startsWith(Optional.Keyword) == true) {
                let MarkerGet = new Optional.Marker(LineGet.slice(Optional.Keyword.length));
                Lines[i - 1] = MarkerGet.EmitFunction(true);
                Lines.splice(i, MarkerGet.Count + 1);
            }
        }
        return Lines.join("\n");
    },
    Postprocess: function( editor, code ) {
        let Lines = code.split("\n");
        for(var i = 0; i < Lines.length; i++) {
            let LineGet = Lines[i], Offset = LineGet.indexOf("function");
            if (Offset > -1) {
                // Capture the function name
                let FunctionName = LineGet.slice(Offset + "function".length).trim(), FunctionType = "Postfix";
                FunctionName = FunctionName.slice(0, FunctionName.indexOf("(")).trim();
                if (FunctionName.length == 0) {
                    FunctionName = LineGet.slice(0, LineGet.indexOf("=")).trim();
                    FunctionType = "Prefix";
                }

                // Capture the arguments
                let FunctionSignature = LineGet.slice(Offset + "function".length), ArgumentOffset = FunctionSignature.indexOf("(");
                FunctionSignature = FunctionSignature.slice(ArgumentOffset + 1, FunctionSignature.lastIndexOf(")"));
                let ArgumentList = FunctionSignature.split(",");
                
                // Parse for optional arguments
                let ArgumentBuild = [], ArgumentOptional = 0;
                for(var j = 0; j < ArgumentList.length; j++) {
                    let ArgumentGet = ArgumentList[j].trim(), ArgumentOffset = ArgumentGet.indexOf("=");
                    if (ArgumentOffset > -1) {
                        ArgumentBuild.push([
                            ArgumentGet.slice(0, ArgumentOffset),
                            ArgumentGet.slice(ArgumentOffset + 1)
                        ]);
                        ArgumentOptional++;
                    } else {
                        ArgumentBuild.push(ArgumentGet);
                    }
                }

                if (ArgumentOptional > 0) {
                    let MarkerNew = new Optional.Marker(FunctionName, ArgumentBuild, FunctionType, ArgumentOptional);

                    // Update signature to remove optional arguments
                    Lines[i] = MarkerNew.EmitFunction(false);

                    // Create marker and insert
                    Lines.splice(++i, 0, MarkerNew.Emit());
                    for(var j = 0; j < ArgumentBuild.length; j++) {
                        let ArgumentGet = ArgumentBuild[j];
                        if (typeof(ArgumentGet) == "object") {
                            Lines.splice(++i, 0, `${ArgumentGet[0]} = (${ArgumentGet[0]} != undefined ? ${ArgumentGet[0]} : ${ArgumentGet[1]})`);
                        }
                    }
                }

                
            }
        }
        return Lines.join("\n");
    }
};

(function() {
    GMEdit.register("optional", {
        init: function() {
            Optional.Initialize();
        }
    });
})();
