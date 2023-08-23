module.exports = function ({types: t}) {
    return {
        visitor: {
            JSXElement(path) {
                const openingElement = path.node.openingElement;
                const tagNameExpression = openingElement.name;
                const tagName = tagNameExpression.name;

                const isUpperCaseTagName = tagName[0] === tagName[0].toUpperCase();
                const tagNameAST = isUpperCaseTagName
                    ? t.identifier(tagName)
                    : t.stringLiteral(tagName);

                const attributes = openingElement.attributes.map(attr => {
                    if (t.isJSXAttribute(attr)) {
                        const attributeName = attr.name.name;
                        const attributeValue = t.isJSXExpressionContainer(attr.value)
                            ? attr.value.expression
                            : attr.value;

                        return t.objectProperty(
                            t.identifier(attributeName),
                            attributeValue
                        );
                    }
                });

                const children = path.node.children.filter(child => t.isJSXElement(child) || t.isJSXExpressionContainer(child)).map(child => {
                    if (t.isJSXElement(child)) {
                        return child;
                    } else {
                        return child.expression;
                    }
                });

                // Create Jq.createElement function call
                const createElementCall = t.callExpression(
                    t.memberExpression(t.identifier('Jq'), t.identifier('createElement')),
                    [
                        tagNameAST,
                        attributes.length > 0
                            ? t.objectExpression(attributes.filter(Boolean)) // Filter out null attributes
                            : t.nullLiteral(),
                        t.arrayExpression(children),
                    ]
                );

                // Replace JSX element with the Jq.createElement call
                path.replaceWith(createElementCall);
            },
        },
    };
};