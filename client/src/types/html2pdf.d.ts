declare module 'html2pdf.js' {
  function html2pdf(): html2pdf.Html2PdfInstance;
  
  namespace html2pdf {
    interface Html2PdfInstance {
      from(element: HTMLElement | string): Html2PdfFromInstance;
      set(opt: any): Html2PdfInstance;
    }
    
    interface Html2PdfFromInstance {
      save(): void;
      toPdf(): any;
    }
  }
  
  export = html2pdf;
}
