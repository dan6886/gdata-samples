module DoclistHelper
  
  def select_export_formats(doc_type, export_link)
    url_list = {}
    case doc_type
      when ApplicationController::DOCUMENT_DOC_TYPE
        url_list['pdf'] = export_link + '&exportFormat=pdf'
        url_list['doc'] = export_link + '&exportFormat=doc'
        url_list['odt'] = export_link + '&exportFormat=odt'
        url_list['png'] = export_link + '&exportFormat=png'
        url_list['html'] = export_link + '&exportFormat=html'
        url_list['rtf'] = export_link + '&exportFormat=rtf'
        url_list['txt'] = export_link + '&exportFormat=txt'
      when ApplicationController::PRESO_DOC_TYPE
        url_list['pdf'] = export_link + '&exportFormat=pdf'
        url_list['ppt'] = export_link + '&exportFormat=ppt'
        url_list['swf'] = export_link + '&exportFormat=swf'
      when ApplicationController::SPREADSHEET_DOC_TYPE
        url_list['pdf'] = export_link + '&fmcmd=12'
        url_list['xls'] = export_link + '&fmcmd=4'
        url_list['csv'] = export_link + '&fmcmd=5&gid=0'
        url_list['tsv'] = export_link + '&fmcmd=23&gid=0'
        url_list['html'] = export_link + '&fmcmd=102'
        url_list['ods'] = export_link + '&fmcmd=13'
      when ApplicationController::PDF_DOC_TYPE
        url_list['pdf'] = export_link
      else
        return
    end
    return select_tag('export_url', options_for_select(url_list))
  end
  
end
