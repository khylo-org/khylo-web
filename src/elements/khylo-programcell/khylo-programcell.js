const ProgramCellPrototype = Object.create(HTMLButtonElement.prototype);

ProgramCellPrototype.detachedCallback = function () {
    this.posLeft = null;
    this.posWidth = null;
    this.guideProgramName = null;
};

document.registerElement('khylo-programcell', {
    prototype: ProgramCellPrototype,
    extends: 'button'
});
